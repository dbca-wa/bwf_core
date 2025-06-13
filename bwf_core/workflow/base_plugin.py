from time import sleep
import logging
from bwf_core.models import WorkFlowInstance, ComponentInstance
from bwf_core.components.utils import calculate_next_node


logger = logging.getLogger(__name__)

class BasePlugin:
    
    def __init__(self, component_instance:ComponentInstance, workflow_instance: WorkFlowInstance, context={}):
        self.type = "node"
        self.component = component_instance
        self.workflow_instance = workflow_instance
        self.context = context

        # output
    def workflow_instance_id(self):
        return self.workflow_instance.id

    def component_instance_id(self):
        return self.component.id

    def set_plugin_component(self, executableComponent):
        # self.component = executableComponent
        pass
    
    def execute(self):
        raise Exception("Need to implement the execute method")
    
    def on_children_complete(self):
        self.on_complete()
    
    def set_output(self, success:bool, message="", data={}):
        # Call workflow coordinator to set the output and call the next node
        # store result in workspace instance context
        self.component.output = {
            "success": success,
            "message": message,
            "data": data
        }
        self.component.save()
        if success:
            self.on_complete()
        else:
            self.on_failure(message)

    def call_next_node(self, override_route=None):
        from bwf_core.tasks import register_workflow_step
        from bwf_core.components.tasks import find_component_in_tree

        workflow_definition = self.workflow_instance.get_json_definition()
        current_definition = find_component_in_tree(workflow_definition, self.component.component_id)
        if not current_definition:
            raise Exception(f"Component {self.component.component_id} not found in workflow definition")
        
        output = self.component.output if self.component.output else {}
        input_params = self.workflow_instance.variables
        input_params['output'] = output.get("data", {})
        next_component_id = override_route if override_route else calculate_next_node(current_definition, input_params)
        if next_component_id:
            register_workflow_step(self.workflow_instance,
                                   step=next_component_id,
                                   parent_node_instance=self.component.parent_node,
                                   additional_inputs={ "incoming": output.get("data", {}) })
        else:
            # if there is no next component, we check if the parent node has a next node
            if self.component.parent_node:
                parent_node_instance = self.component.parent_node
                parent_id = self.component.parent_node.component_id
                parent_definition = find_component_in_tree(workflow_definition, parent_id)
                if parent_definition:
                    plugin_wrapper_class = PluginWrapperFactory.wrapper(parent_definition['node_type'])
                    plugin_wrapper_instance = plugin_wrapper_class(parent_node_instance, self.workflow_instance, context={
                                                        "variables": self.workflow_instance.variables.get("variables", {}),
                                                        "inputs": self.workflow_instance.variables.get("inputs", {}),
                                                    })
                    plugin_wrapper_instance.on_children_complete()
                else:
                    raise Exception(f"Parent component {parent_id} not found in workflow definition")
            else:
                self.workflow_instance.set_status_completed()

    def on_complete(self):
        self.component.set_status_completed()
        self.call_next_node()
    
    def on_failure(self, error=""):
        from bwf_core.components.tasks import find_component_in_tree

        workflow_definition = self.workflow_instance.get_json_definition()
        current_definition = find_component_in_tree(workflow_definition, self.component.component_id)
        on_fail = current_definition.get("conditions", {}).get("on_fail", {})
        if not on_fail:
            pass
        if on_fail.get("action", None) == "terminate":
            logger.info(f"Component {self.component.component_id} terminated due to error: {error}")
            self.workflow_instance.set_status_error(error)
            return
        elif on_fail.get("action", None) == "ignore":
            logger.info(f"Component {self.component.component_id} ignored error: {error}")
            self.component.set_status_completed()
            self.call_next_node()
            return
        elif on_fail.get("action", None) == "retry":
            logger.info(f"Component {self.component.component_id} retrying due to error: {error}")
            options = self.component.options if self.component.options else {}
            
            max_retries = on_fail.get("max_retries", 0)
            retry_interval = on_fail.get("retry_interval", 100)
            current_retries = options.get("retries", 0)
            current_retries += 1
            if current_retries <= max_retries:
                options = {
                    "retries": current_retries,
                }
                self.component.options = options
                self.component.save()

                self.component.set_status_pending()
                self.workflow_instance.set_status_running()
                sleep(retry_interval / 1000)  # Convert milliseconds to seconds
                self.execute()
                return
            else:
                self.component.set_status_error(error)
                self.workflow_instance.set_status_error(f"Max retries reached for component {self.component.component_id}")
                return
        elif on_fail.get("action", None) == "custom":
            # TODO: Implement custom action
            pass
        self.component.set_status_error(error)
        self.workflow_instance.set_status_error(error)

    def collect_context_data(self):
        context = self.context | {
            "input": self.component.input,
        }
        return context

    def update_workflow_variable(self, id, value):
        workflow_variables = self.workflow_instance.get_json_definition().get('variables')
        variable = None
        for var_key in workflow_variables:
            if workflow_variables[var_key].get('id') == id:
                variable = workflow_variables[var_key]
                break

        self.workflow_instance.variables['variables'][variable['id']] = value
        self.workflow_instance.variables['variables'][variable['key']] = value
        self.workflow_instance.save()



class NodePlugin(BasePlugin):
    pass

class AyncNodePlugin(BasePlugin):
    def __init__(self, component_instance:ComponentInstance, workflow_instance: WorkFlowInstance, context={}):
        super().__init__(component_instance, workflow_instance, context)
        self.type = "async-node"
        self.component = component_instance
        self.workflow_instance = workflow_instance
        self.context = context
    
    def on_continue_task(self):
        pass

    def on_awaiting_action(self):
        self.component.set_status_awaiting_action()
        pass


class LoopPlugin(BasePlugin):

    def __init__(self, component_instance:ComponentInstance, workflow_instance: WorkFlowInstance, context={}):
        super().__init__(component_instance, workflow_instance, context)
        self.type = "loop"
        self.options = self.component.options if self.component.options else {
           "context": { "index": 0, "item" : None }
        }
    
    def on_children_complete(self):
        from bwf_core.tasks import start_pending_component

        index = self.options.get("index", 0)
        index += 1
        self.options["index"] = index

        self.component.options['index'] = index
        self.component.save()
        start_pending_component(self.component, parent=self.component.parent_node)


class BranchPlugin(BasePlugin):
    def __init__(self, component_instance:ComponentInstance, workflow_instance: WorkFlowInstance, context={}):
        super().__init__(component_instance, workflow_instance, context)
        self.type = "branch"



    def on_complete(self):
        output = self.component.output
        self.component.set_status_completed()
        next_node_id = output.get('data', {}).pop('next_component_id')
        self.component.output  = output
        self.component.save()
        self.call_next_node(next_node_id)

    def call_next_node(self, override_route=None):
        from bwf_core.tasks import register_workflow_step
        from bwf_core.components.tasks import find_component_in_tree

        workflow_definition = self.workflow_instance.get_json_definition()
        current_definition = find_component_in_tree(workflow_definition, self.component.component_id)
        if not current_definition:
            raise Exception(f"Component {self.component.component_id} not found in workflow definition")
        
        output = self.component.output if self.component.output else {}
        input_params = self.workflow_instance.variables
        input_params['output'] = output.get("data", {})
        next_component_id = override_route if override_route else calculate_next_node(current_definition, input_params)
        output = self.component.output if self.component.output else {}
        if next_component_id:
            register_workflow_step(self.workflow_instance, 
                                   step=next_component_id, 
                                   parent_node_instance=self.component, 
                                   additional_inputs={ "incoming": output.get("data", {}) })
        else:
            self.workflow_instance.set_status_completed()


class SwitchPlugin(BasePlugin):
    def __init__(self, component_instance, workflow_instance, context={}):
        super().__init__(component_instance, workflow_instance, context)
        self.type = "switch"
        self.switch = self.component['config'].get("switch", {})
        self.switch_variable = self.switch.get("variable")
        self.switch_cases = self.switch.get("cases", {})
        self.switch_default = self.switch.get("default")
        self.switch_index = 0


class PluginWrapperFactory:
    @staticmethod
    def wrapper(plugin_type="node"):
        if plugin_type == "node":
            return NodePlugin
        if plugin_type == "async-node":
            return AyncNodePlugin
        if plugin_type == "loop":
            return LoopPlugin
        if plugin_type == "branch":
            return BranchPlugin
        if plugin_type == "switch":
            return SwitchPlugin
        return BasePlugin
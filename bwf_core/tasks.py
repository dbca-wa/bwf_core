from bwf_core.workflow.base_plugin import PluginWrapperFactory
from bwf_core.controller.controller import BWFPluginController
from bwf_core.models import (
    Workflow,
    WorkFlowInstance,
    WorkflowInstanceFactory,
    WorkflowComponentInstanceFactory,
    ComponentInstance,
    FailureHandleTypesEnum,
)
from bwf_core.components.tasks import find_component_in_tree
import logging
import time

logger = logging.getLogger(__name__)



'''
This module contains functions to manage workflow instances, including starting workflows,
registering workflow steps, starting components, and processing async responses.
'''



def start_workflow(workflow_id, payload={}):
    """
    Start a workflow instance with the given workflow ID and payload.
    """
    instance = None
    try:
        workflow = Workflow.objects.get(id=workflow_id)
        workflow_version = workflow.get_active_version()
        if not workflow_version:
            raise Exception("Workflow doesn't have an active version")
        instance = WorkflowInstanceFactory.create_instance(workflow_version, payload)
        definition = instance.get_json_definition()
        components = definition.get("workflow", {})
        if not components:
            raise Exception("Workflow doesn't have any components")
        # get entry point
        entry_point = None
        for key, value in components.items():
            if value.get("conditions", {}).get("is_entry", False):
                entry_point = value
                break
        if entry_point is None:
            err = "Workflow doesn't have an entry point"
            instance.set_status_error(err)
            raise Exception(err)
        register_workflow_step(instance, entry_point["id"])
        return instance
    except Exception as e:
        if instance:
            instance.set_status_error(str(e))
            return instance
        raise e


def register_workflow_step(
    workflow_instance: WorkFlowInstance,
    step: str,
    additional_inputs={},
    parent_node_instance=None,
):
    """
    Register a workflow step by creating a component instance for the given step (component ID). 
    This component ID should exist within the workflow definition.
    :param workflow_instance: The workflow instance to register the step in.
    :param step: The ID of the step (component) to register.
    :param additional_inputs: Optional, usually are the outputs of the previously executed node.
    :param parent_node_instance: The parent node instance, if any.
    """
    try:
        definition = workflow_instance.get_json_definition()
        step_component = find_component_in_tree(definition, step)

        if step_component is None:
            workflow_instance.set_status_completed()
            return
        # Merge workflow variables with additional inputs
        input_params = workflow_instance.variables | additional_inputs
        
        component_instance = WorkflowComponentInstanceFactory.create_component_instance(
            workflow_instance, step_component, parent_node_instance, input_params
        )

        if component_instance is None:
            workflow_instance.set_status_error(
                f"Component instance could not be created. Step: {step} {step_component}"
            )
            raise Exception("Component instance could not be created")

        workflow = workflow_instance.workflow_version.workflow
        if workflow.is_short_lived():
            logger.info(f"Starting component {component_instance.component_id} - Plugin {component_instance.plugin_id} - workflow {workflow.name}")
            start_pending_component_in_thread(component_instance)
        else:
            logger.info(f"Registered component {component_instance.component_id} - Plugin {component_instance.plugin_id} - workflow {workflow.name}")
        return workflow_instance
    except Exception as e:
        logger.error(e)
        workflow_instance.set_status_error(str(e))
    return None


def start_pending_component(current_component: ComponentInstance, parent=None):
    workflow_instance = current_component.workflow
    try:
        logger.info(
            f"Starting pending component {current_component.component_id} - Plugin {current_component.plugin_id}"
        )
        current_component.set_status_running()
        controller = BWFPluginController.get_instance()
        plugin_module = controller.get_plugin_module(
            current_component.plugin_id, current_component.plugin_version
        )
        if not plugin_module:
            err = f"Plugin {current_component.plugin_id} not found"
            current_component.set_status_error(err)
            workflow_instance.set_status_error(err)
            return

        # TODO: Get Global variables
        # get secrets and globals
        # node | loop | branch | switch
        current_component_definition = find_component_in_tree(
            workflow_instance.get_json_definition(), current_component.component_id
        )
        plugin_wrapper_class = PluginWrapperFactory.wrapper(
            current_component_definition["node_type"]
        )
        plugin_wrapper_instance = plugin_wrapper_class(
            current_component,
            workflow_instance,
            context={
                "variables": current_component.workflow.variables.get("variables", {}),
                "inputs": current_component.workflow.variables.get("inputs", {}),
                "incoming": current_component.input.get("incoming", {}),
            },
        )
        try:
            # calls execute but should call any method that is defined in the plugin that receives a plugin_wrapper_instance
            plugin_module.execute(plugin_wrapper_instance)
        except Exception as e:
            logger.error(
                f"Error while executing component {current_component.id} error: {str(e)}"
            )
            if plugin_wrapper_instance:
                plugin_wrapper_instance.on_failure(str(e))
            else:
                current_component.set_status_error(str(e))
                workflow_instance.set_status_error(str(e))
    except Exception as e:
        logger.error(
            f"Error while starting pending component {current_component.id} error: {str(e)}"
        )
        current_component.set_status_error(str(e))


def validate_plugin_object(
    workflow_instance_id, component_instance_id, plugin_object_id
):
    """
    Validate the plugin object ID for a given workflow and component instance.
    """
    try:
        workflow_instance = WorkFlowInstance.objects.get(id=workflow_instance_id)
        component_instance = ComponentInstance.objects.get(id=component_instance_id)
        if not workflow_instance or not component_instance:
            raise Exception("Workflow instance or component instance not found")

        controller = BWFPluginController.get_instance()
        plugin_module = controller.get_plugin_module(
            component_instance.plugin_id, component_instance.plugin_version
        )
        if not plugin_module:
            raise Exception(f"Plugin {component_instance.plugin_id} not found")
        if not hasattr(plugin_module, "validate_object"):
            workflow_instance.set_status_error(
                f"Plugin {component_instance.plugin_id} does not support object validation"
            )
            raise Exception(
                f"Plugin {component_instance.plugin_id} does not support object validation"
            )

        return plugin_module.validate_object(plugin_object_id)
    except Exception as e:
        logger.error(f"Error while validating plugin object: {str(e)}")
        return False


def can_async_response_be_processed(
    workflow_instance_id, component_instance_id, plugin_object_id
):
    """
    Validate the plugin object ID for a given workflow and component instance.
    """
    try:
        workflow_instance = WorkFlowInstance.objects.get(id=workflow_instance_id)
        component_instance = ComponentInstance.objects.get(id=component_instance_id)
        if not workflow_instance or not component_instance:
            raise Exception("Workflow instance or component instance not found")

        controller = BWFPluginController.get_instance()
        plugin_module = controller.get_plugin_module(
            component_instance.plugin_id, component_instance.plugin_version
        )
        if not plugin_module:
            raise Exception(f"Plugin {component_instance.plugin_id} not found")
        if not hasattr(plugin_module, "can_be_processed"):
            # default to True if the plugin does not support async response processing
            return True

        return plugin_module.can_be_processed(plugin_object_id)
    except Exception as e:
        logger.error(f"Error while validating plugin object: {str(e)}")
        return False


def process_async_response(
    workflow_instance_id, component_instance_id, data=None, plugin_object_id=None
):
    """
    Process the async response from a component.
    """
    try:
        workflow_instance = WorkFlowInstance.objects.get(id=workflow_instance_id)
        component_instance = ComponentInstance.objects.get(id=component_instance_id)
        if not workflow_instance or not component_instance:
            raise Exception("Workflow instance or component instance not found")

        controller = BWFPluginController.get_instance()
        plugin_module = controller.get_plugin_module(
            component_instance.plugin_id, component_instance.plugin_version
        )
        if not plugin_module:
            raise Exception(f"Plugin {component_instance.plugin_id} not found")

        current_component_definition = find_component_in_tree(
            workflow_instance.get_json_definition(), component_instance.component_id
        )
        plugin_wrapper_class = PluginWrapperFactory.wrapper(
            current_component_definition["node_type"]
        )
        plugin_wrapper_instance = plugin_wrapper_class(
            component_instance,
            workflow_instance,
            context={
                "variables": workflow_instance.variables.get("variables", {}),
                "inputs": workflow_instance.variables.get("inputs", {}),
                "incoming": component_instance.input.get("incoming", {}),
            },
        )
        # calls callback but should call any method that is defined in the plugin that receives a plugin_wrapper_instance
        if not hasattr(plugin_module, "callback"):
            workflow_instance.set_status_error(
                f"Plugin {component_instance.plugin_id} does not support async response processing"
            )
            raise Exception(
                f"Plugin {component_instance.plugin_id} does not support async response processing"
            )
        # callback(plugin_wrapper_instance, plugin_object_id, data, user)
        plugin_module.callback(plugin_wrapper_instance, plugin_object_id, data)
    except Exception as e:
        logger.error(f"Error while processing async response: {str(e)}")


# Deprecated
def initiate_fallback_component_action(current_component: ComponentInstance):
    base_component = current_component.component
    output = current_component.output if current_component.output else {}
    if hasattr(base_component, "on_fail"):
        fallback = base_component.on_fail
        if fallback.type == FailureHandleTypesEnum.RETRY:
            if fallback.num_retries < fallback.max_retries:
                time.sleep(max(fallback.get_retry_interval_in_seconds(), 5))
                fallback.num_retries += 1
                fallback.save()
                return start_pending_component(current_component)
            else:
                current_component.set_status_error("Max retries reached")
                # for now, we finish the workflow, but if this is a subworkflow, we can handle it differently
                current_component.workflow.set_status_error(
                    output.get("message", "Error while executing component")
                )

                return None
        if fallback.type == FailureHandleTypesEnum.TERMINATE:
            current_component.set_status_error(
                output.get("message", "Error while executing component")
            )
            # for now, we finish the workflow, but if this is a subworkflow, we can handle it differently
            current_component.workflow.set_status_error(
                output.get("message", "Error while executing component")
            )
            return
        if fallback.type == FailureHandleTypesEnum.IGNORE:
            current_component.set_status_error(
                "Skipped error while executing component"
            )
            register_workflow_step(
                current_component.workflow,
                current_component.component.step.index,
                output.get("data", {}),
            )
            return
        if fallback.type == FailureHandleTypesEnum.CUSTOM:
            pass
    else:
        current_component.set_status_error(
            output.get("message", "Error while executing component")
        )
        # for now, we finish the workflow, but if this is a subworkflow, we can handle it differently
        current_component.workflow.set_status_error(
            output.get("message", "Error while executing component")
        )
        return None


def start_pending_component_in_thread(current_component: ComponentInstance):
    from threading import Thread

    thread = Thread(
        target=start_pending_component,
        args=(current_component,),
        daemon=True,
    )
    thread.start()
    return thread

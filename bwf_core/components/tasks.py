from bwf_core.controller.controller import BWFPluginController

import logging
import uuid
from .utils import process_base_input_definition, get_incoming_values, adjust_workflow_routing

logger = logging.getLogger(__name__)

def extract_workflow_mapping(workflow_components, workflow_mapping={}):
    for p_key, parent_component in workflow_components.items():
        workflow_mapping[p_key] = {
            'id': p_key,
            'path': parent_component.get('config', {}).get('path', None),
            'plugin_id': parent_component.get('plugin_id', None),
            'version_number': parent_component.get('version_number', None),
        }
        node_type = parent_component.get('node_type', 'node')
        if node_type != 'node':
            for flow_key, flow in parent_component['config'][node_type].items():
                extract_workflow_mapping(flow, workflow_mapping)

def find_component_in_tree(workflow_definition, component_id):
    workflow_components = workflow_definition.get('workflow', {})
    mapping = workflow_definition['mapping'].get(component_id, None)
    if not mapping or not mapping.get('path', None):
        raise Exception(f"Component {component_id} not found in mapping")
    path = mapping.get('path', None)
    path_list = path.split('.')
    if len(path_list) == 0:
        raise Exception(f"Component {component_id} not found in mapping")
    component = None
    path_length = len(path_list)
    for i in range(0, path_length):
        path = path_list[i]
        component = workflow_components.get(path, None) if i == 0 else component.get(path, None)
        if not component:
            raise Exception(f"Component {component_id} not found in mapping")
    return component

def update_mapping_from_deleted_component(workflow_definition, component_id):
    mapping = workflow_definition.get('mapping', {})
    items_to_delete = []
    for key, value in mapping.items():
        if key == component_id:
            del mapping[key]
            break
        path = value.get('path', "")
        path_list = path.split('.')
        if component_id in path_list:
            items_to_delete.append(key)
    for item in items_to_delete:
        del mapping[item]

def is_workflow_node(node):
    if not node:
        return False
    if not isinstance(node, dict):
        return False
    if not node.get('id', None):
        return False
    if not node.get('plugin_id', None):
        return False
    if not node.get('version_number', None):
        return False
    if not node.get('node_type', None):
        return False
    if not node.get('config', None):
        return False
    if not node.get('conditions', None):
        return False
    return True

def get_parent_node(workflow_definition, component_id):
    workflow_components = workflow_definition.get('workflow', {})
    mapping = workflow_definition['mapping'].get(component_id, None)
    if not mapping or not mapping.get('path', None):
        raise Exception(f"Component {component_id} not found in mapping")
    path = mapping.get('path', None)
    path_list = path.split('.')
    if len(path_list) == 0:
        raise Exception(f"Component {component_id} not found in mapping")
    
    parent_node = None
    workflow_level = workflow_components
    path_length = len(path_list) - 1
    
    for i in range(0, path_length):
        path = path_list[i]
        workflow_level = workflow_level.get(path, None)
        if not workflow_level:
            raise Exception(f"Component {component_id} not found in mapping")
        if is_workflow_node(workflow_level):
            parent_node = workflow_level
    return parent_node

def get_encasing_flow(workflow_definition, component_id):
    workflow_components = workflow_definition.get('workflow', {})
    mapping = workflow_definition['mapping'].get(component_id, None)
    if not mapping or not mapping.get('path', None):
        raise Exception(f"Component {component_id} not found in mapping")
    path = mapping.get('path', None)
    path_list = path.split('.')
    if len(path_list) == 0:
        raise Exception(f"Component {component_id} not found in mapping")
    
    encasing_flow = workflow_components
    path_length = len(path_list) - 1
    for i in range(0, path_length):
        path = path_list[i]
        encasing_flow = encasing_flow.get(path, None)
        if not encasing_flow:
            raise Exception(f"Component {component_id} not found in mapping")
    return encasing_flow


# Creation Tasks
def create_component_definition_instance(plugin_id, name, route=None, version_number="1", index=0):
    definition: BWFPluginController = BWFPluginController.get_plugin_definition(plugin_id)
    if not definition:
        raise Exception(f"Plugin {plugin_id} not found")
      
    base_input = definition.get("base_input", [])
    base_output = definition.get("base_output", [])
    ui = definition.get("ui", {})
    inputs = []
    outputs = []
    if base_input:
        input_index = 0
        for input_item in base_input:
            inputs.append(process_base_input_definition(input_item, input_index))
            input_index += 1
    
    if base_output:
        output_index = 0
        for output_item in base_output:
            outputs.append({
                'label': output_item.get("label"),
                'key': output_item.get("key"),
                'data_type': output_item.get("type"),
                'data': output_item.get("data", {}),
            })                
            output_index += 1

    instance = {
        "id": str(uuid.uuid4()),
        "name": name,  
        "plugin_id": plugin_id,
        "version_number": version_number,
        "node_type": definition.get("node_type", "node"),
        "ui": {
            "x": index * 200,
            "y": index * 200,
        },
        "config": {
            "inputs": inputs,
            "outputs": outputs,
        },
        "conditions": {
            "is_entry": False,
            "route": None,
            "on_fail": {}
        },
        "routing": []
    }

    node_definition = node_type_definitions(definition.get("node_type", "node"))
    if node_definition and len(node_definition.keys()) > 0:
        key = list(node_definition.keys())[0]
        instance['config'][key] = node_definition[key]

    return instance


def insert_node_to_workflow(workflow_definition, node, data={}):
    workflow_components = workflow_definition.get('workflow', {})
    mapping = workflow_definition['mapping']
    if mapping is None:
        raise Exception("Mapping not found in workflow definition")
    route = data.get('route', None)
    node_id = node.get('id', None)
    node_path = data.get('node_path', None)
    parent_id = data.get('parent_id', None)
    
    is_entry = data.get('is_entry', False)
    flow = workflow_components
    if parent_id:
        parent_node = find_component_in_tree(workflow_definition, parent_id)
        parent_type = parent_node.get('node_type', 'node')
        if node_path not in parent_node['config'][parent_type]:
            parent_node['config'][parent_type][node_path] = {}

        flow = parent_node['config'][parent_type][node_path]
        is_entry = is_entry or len(parent_node['config'][parent_type][node_path].keys()) == 0
        node['conditions']['is_entry'] = is_entry
        parent_node['config'][parent_type][node_path][node_id] = node
        node['config']['path'] = f"{parent_node['config']['path']}.config.{parent_type}.{node_path}.{node_id}"
        node['config']['local'] = get_parent_context_variables(parent_type)
        adjust_workflow_routing(flow, node_id, route)                    
    else:
        is_entry = is_entry or len(workflow_components.keys()) == 0
        node['conditions']['is_entry'] = is_entry
        workflow_components[node_id] = node
        node['config']['path'] = f"{node_id}"
        adjust_workflow_routing(workflow_components, node_id, route)
    
    if is_entry:
        for key, value in flow.items():
            if value['conditions']['is_entry'] and key != node_id:
                next_node = value
                # node['conditions']['route'] = key
                next_node['conditions']['is_entry'] = False
                next_node['config']['incoming'] = get_incoming_values(node['config']['outputs'])
                break

    workflow_definition['mapping'][node['id']] = {
        'id': node['id'],
        'path': node['config']['path'] ,
        'plugin_id': node['plugin_id'],
        'version_number': node['version_number'],
    }
        
    return node


def node_type_definitions(node_type):

    if node_type == 'branch':
        return {
            node_type: {
                'True' : {},
                'False': {},
            }
        }
    elif node_type == 'switch':
        return {
            node_type: {
                'default': {},
            }
        }
    elif node_type == 'loop':
        return {
            node_type: {
                'flow': {}
            }
        }
    elif node_type == 'node':
        return {
            node_type: {
                
            }
        }

def get_parent_context_variables(parent_node_type):
    if parent_node_type == 'loop':
        return {
            "item": {
                "label": "Item",
                "key": "item",
                "data_type": "object",
                "data": {},
            },
            "index": {
                "label": "Index",
                "key": "index",
                "data_type": "integer",
                "data": {},
            }
        }

    return {}

# END: Creation Tasks
def to_ui_workflow_node(component, parent_info={}):
    definition_info = BWFPluginController().get_instance().get_plugin_definition_info(component.get("plugin_id"))

    workflow_node = {
            "id": component.get("id", None),
            "name": component.get("name", "Node"),
            "plugin_id": component.get("plugin_id"),
            "plugin_info": definition_info.get("plugin_info", {}),
            "version_number": component.get("version_number", "1"),
            "config": component.get("config", {}),
            "ui": component.get("ui", {}) | definition_info.get("ui", {}),
            "node_type": component.get("node_type", "node"),
            "conditions": component.get("conditions", {}),
            "routing": component.get("routing", []),
            "parent_info": parent_info,
        }
    node_type = component.get("node_type", "node")
    if node_type in ['branch','switch', 'loop']:
        flows = component['config'][node_type].keys()
        for flow in flows:
            component['config'][node_type][flow] = list_workflow_nodes(component['config'][node_type][flow], 
                                                                       parent_info={
                                                                           'parent_id': component['id'],
                                                                           'node_path': flow,
                                                                        })
    
    return workflow_node

def list_workflow_nodes(workflow_components, parent_info={}):
    components_list = []
    for key, component in workflow_components.items():
        list_item = to_ui_workflow_node(component, parent_info)
        components_list.append(list_item)
    return components_list

def apply_workflow_entry_removal(workflow_components, is_input, input_key, input_id):
    context = "inputs" if is_input else "variables"
    text = "input" if is_input else "variable"
    name_field = "name"
    errors = []
    for key, component in workflow_components.items():
        inputs = component.get("config", {}).get("inputs", [])
        
        for input_item in inputs:
            value = input_item.get("value", None)
            if value == "" or not value:
                continue
            if value.get("value_ref", None) is not None:
                if value.get("value_ref", {}).get("key", None) == input_key and value.get("value_ref", {}).get("context", None) == context:
                    input_item["value"] = ""
                    continue
            elif value.get("is_expression", False):
                expression = value.get("expression", "")
                alternatives = [f"{context}['{input_key}']", f"{context}[\"{input_key}\"]"]
                for alternative in alternatives:
                    if alternative in expression:
                        errors.append({
                            "component_id": component.get("id"),
                            "error": f"Field {input_item.get(name_field)} references the {text} [{input_key}] inside {component.get('name')}.",
                        })
                        break

        node_type = component.get("node_type", "node")
        if node_type in ['branch','switch', 'loop']:
            flows = component['config'][node_type].keys()
            for flow in flows:
                errors += apply_workflow_entry_removal(component['config'][node_type][flow], is_input, input_key, input_id)
    return errors
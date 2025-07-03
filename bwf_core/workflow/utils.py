from django.db import transaction

from datetime import datetime
from bwf_core.models import WorkflowVersion

def generate_workflow_definition(name, description="", version="0.0.1"):
    info = {
        'name': name,
        'description': description,
        'version': version,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'workflow': {},
        'mapping': {},
        'inputs': {},
        'variables': {},
    }
    return info


def set_workflow_active_version(version: WorkflowVersion):
    workflow = version.workflow
    with transaction.atomic():
        version.set_as_active_version()
        current_definition  = version.get_json_definition()
        new_workflow_definition = generate_workflow_definition(workflow.name, workflow.description, version.version_number)
        new_workflow_definition['workflow'] = current_definition['workflow']
        new_workflow_definition['mapping'] = current_definition['mapping']
        new_workflow_definition['inputs'] = current_definition['inputs']
        new_workflow_definition['variables'] = current_definition['variables']
        workflow.set_json_definition(new_workflow_definition)
    return version


def get_context_item(workflow_config, context, id=None, key=None):
    if not workflow_config or not context:
        raise ValueError("Workflow definition and context must be provided.")
    
    if context in ['incoming', 'output', 'input']:
        values = workflow_config.get('local', {}).get(context, {})
    else:
        values = workflow_config.get(context, {})

    if id:
        return values.get(id, None)
    elif key:
        for value_input in values:
            if value_input.get("key") == key:
                return value_input
    return None

def get_value_from_context(workflow_definition, context, id=None, key=None):
    if not workflow_definition or not context:
        raise ValueError("Workflow definition and context must be provided.")
    if context not in workflow_definition:
        raise ValueError(f"Context '{context}' not found in dict provided.")
    values = workflow_definition[context]
    if id:
        return values.get(id, None)
    elif key:
        for value_key, value_input in values.items():
            if value_key == key:
                return value_input
    return None



def get_workflow_config(workflow_definition, node_config = {}):
    if not workflow_definition or 'workflow' not in workflow_definition:
        raise ValueError("Workflow definition must be provided and contain 'workflow' key.")
    
    input_values = workflow_definition.get("inputs", {})
    local_variables = workflow_definition.get("variables", {})
    workflow_config = {
        'inputs': {},
        'variables': {},
        'local': {},
    }

    for key in local_variables:
        variable = local_variables[key]
        config = {
            "id": variable["id"],
            "key": variable["key"],
            "name": variable["name"],
            "data_type": variable["data_type"],
        }
        workflow_config[variable['context']][key] = config
        workflow_config[variable['context']][variable['key']] = config

    for key in input_values:
        input = input_values[key]
        config = {
            "id": input["id"],
            "key": input["key"],
            "name": input["label"],
            "data_type": input["data_type"],
        }
        workflow_config['inputs'][input["id"]] = config
        workflow_config['inputs'][input["key"]] = config
    if node_config:
        workflow_config['local']['input'] = node_config.get("inputs", {})
        workflow_config['local']['output'] = node_config.get("outputs", {})
        workflow_config['local']['incoming'] = node_config.get("incoming", {})

    return workflow_config
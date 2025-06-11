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


def get_variable_info(workflow_definition, id=None, key=None):
    if not workflow_definition or not workflow_definition.get('variables'):
        return None
    variables = workflow_definition['variables']
    if id:
        return variables.get(id, None)
    elif key:
        for variable in variables.values():
            if variable.get('key') == key:
                return variable
    return None

def get_input_info(workflow_definition, id=None, key=None):
    if not workflow_definition or not workflow_definition.get('inputs'):
        return None
    inputs = workflow_definition['inputs']
    if id:
        return inputs.get(id, None)
    elif key:
        for input_item in inputs.values():
            if input_item.get('key') == key:
                return input_item
    return None
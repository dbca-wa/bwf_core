import uuid

def validate_workflow_required_fields(workflow_components):
    """
    Validate that all required fields in the workflow components are filled.
    """
    errors = []
    for p_key, component in workflow_components.items():
        inputs = component['config'].get('inputs', [])
        for input in inputs:
            if input.get('required', False) and input.get('value', "") == "":
                errors.append(f"Required input '{input['name']}' is missing for component '{component['name']}'")
                
        node_type = component.get('node_type', 'node')
        if node_type != 'node':
            for flow_key, flow in component['config'][node_type].items():
                errors += validate_workflow_required_fields(flow)
    return errors


def add_workflow_input_field(workflow_definition, key, input_field={}, parent_component=None):
    workflow_inputs = workflow_definition.get("inputs", {})
    id = str(uuid.uuid4())
    
    data_type = input_field.get("data_type")
    if not key:
        raise ValueError("Input field must have a 'key' attribute")
    if not data_type:
        raise ValueError("Input field must have a 'data_type' attribute")

    for k, input in workflow_inputs.items():
        if input.get("key") == key:
            key = f"{key}_{id[0:8]}"
            break

    new_input = {
        "label": input_field.get("label"),
        "id": id,
        "key": key,
        "data_type": data_type,
        "description": input_field.get("description", ""),
        "default_value": input_field.get("default_value"),
        "required": input_field.get("required", False),
        "parent_component": parent_component,
    }
    workflow_inputs[id] = new_input
    workflow_definition["inputs"] = workflow_inputs
    return new_input
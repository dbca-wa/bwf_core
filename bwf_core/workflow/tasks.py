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
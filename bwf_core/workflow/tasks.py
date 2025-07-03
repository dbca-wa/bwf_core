import uuid


def validate_workflow_required_fields(workflow_components):
    """
    Validate that all required fields in the workflow components are filled.
    """
    errors = []
    for p_key, component in workflow_components.items():
        inputs = component["config"].get("inputs", [])
        for input in inputs:
            if input.get("required", False):
                if input.get("value", "") == "":
                    errors.append(
                        f"Required input '{input['name']}' is missing for component '{component['name']}'"
                    )
                else:
                    is_valid, message = validate_field_value(input.get("value"))
                    if not is_valid:
                        errors.append(
                            f"Input ['{input.get('name', '')}'] has an invalid value: {message}"
                        )
            else:
                if isinstance(input.get("value", {}), dict) and input.get(
                    "value", {}
                ).get("is_condition", False):
                    is_valid, message = validate_conditional_field_value(
                        input.get("value", {}).get("value", [])
                    )
                    if not is_valid:
                        errors.append(
                            f"Input ['{input.get('name', '')}'] has invalid conditional values: {message}"
                        )
                elif isinstance(input.get("value", {}), dict) and input.get(
                    "value", {}
                ).get("is_expression", False):
                    if not input.get("value", {}).get("value", ""):
                        errors.append(
                            f"Input ['{input.get('name', '')}'] has an invalid expression value"
                        )

        node_type = component.get("node_type", "node")
        if node_type != "node":
            for flow_key, flow in component["config"][node_type].items():
                errors += validate_workflow_required_fields(flow)
    return errors


def validate_field_value(input_value):
    value = input_value.get("value", {})
    is_expression = input_value.get("is_expression", False)
    is_condition = input_value.get("is_condition", False)

    if is_condition:
        is_valid, error_message = validate_conditional_field_value(value)
        if not is_valid:
            return False, error_message
    elif is_expression:
        if not input_value.get("value", ""):
            return False, "Invalid Expression value"

    return True, ""


def validate_workflow_routing_configuration(workflow_definition):
    components = workflow_definition.get("workflow", {})
    mapping = workflow_definition.get("mapping", {})
    errors = []
    for component_key, component in components.items():
        routing = component.get("routing", [])
        if not routing:
            continue
        node_errors = validate_node_routing_configuration(component)
        if len(node_errors):
            errors.append(node_errors)
        else:
            for route in routing:
                route = route.get("route", "")
                if route not in mapping:
                    errors.append(
                        f"Route '{route}' in component '{component_key}' does not exist in nodes mapping"
                    )
        if component.get("node_type") != "node":
            for flow_key, flow in (
                component.get("config", {}).get(component.get("node_type"), {}).items()
            ):
                errors += validate_workflow_routing_configuration(flow)

    return errors


def validate_node_routing_configuration(node):
    routing = node.get("routing", [])
    errors = []
    for route in routing:
        condition = route.get("condition", {})
        route = route.get("route", "")

        if not route:
            errors.append(
                f"Route in component '{node.get('name', 'unknown')}' is empty"
            )
            continue
        if condition == "" or condition is None:
            continue

        is_valid, message = validate_field_value(condition)
        if not is_valid:
            errors.append(
                f"Condition in component '{node.get('name', 'unknown')}' has an invalid value: {message}"
            )
    return errors


def validate_conditional_field_value(conditional_value):
    if not isinstance(conditional_value, list):
        return False, "Conditional value must be a list"
    if len(conditional_value) == 0:
        return False, "Conditional value has no conditions"

    for condition in conditional_value:
        is_valid, message = validate_field_value(condition)
        if not is_valid:
            return False, f"Condition has an invalid value: {message}"

    return True, ""


def add_workflow_input_field(
    workflow_definition, key, input_field={}, parent_component=None
):
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

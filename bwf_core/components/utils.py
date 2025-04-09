def process_base_input_definition(input_item, input_index):
    new_input = {
        'name': input_item.get("label"),
        'key': input_item.get("key"),
        'data_type': input_item.get("type"),
        'value': "",
        'json_value': {
            "type": input_item.get("type"),
            "options": input_item.get("options", None),
            "value_rules": input_item.get("value_rules"),
        },
        'order': input_index,
        'required': input_item.get("required", False)
    }

    if input_item.get("type") == "array":
        structure = input_item.get("value_rules", {}).get("structure", None)
        if not structure:
            pass
        else:
            new_input['json_value']['multi'] = True
            new_input['json_value']['dynamic'] = input_item.get("value_rules").get("dynamic", False)
            new_input['json_value']['structure'] = {}
            structure_index = 0
            for key, value in structure.items():
                new_input['json_value']['structure'][key] = process_base_input_definition(value, structure_index)
                structure_index += 1

    return new_input


def adjust_workflow_routing(workflow_components, instance_id, route):
    instance = workflow_components[instance_id]
    if route and route in workflow_components:
        node_before = workflow_components[route]
        oririginal_route = node_before['conditions']['route']
        node_before['conditions']['route'] = instance_id
        instance['config']['incoming'] = get_incoming_values(node_before['config']['outputs'])

        if oririginal_route and oririginal_route in workflow_components:
            node_next = workflow_components[oririginal_route]
            instance['conditions']['route'] = oririginal_route
            node_next['config']['incoming'] = get_incoming_values(instance['config']['outputs'])

def get_incoming_values(config_outputs):
   if not config_outputs:
       return []
   incoming_values = []
   for output in config_outputs:
        incoming_values.append({
            "label": output['label'],
            "key": output['key'],
            "data_type": output['data_type'],
            "data": output.get("data", None)
        })

   return incoming_values
        
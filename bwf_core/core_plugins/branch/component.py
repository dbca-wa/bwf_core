from bwf_core.workflow.base_plugin import BranchPlugin
from bwf_core.components.tasks import find_component_in_tree


def execute(plugin:BranchPlugin):
    inputs = plugin.collect_context_data()
    component_input = inputs['input']
    condition = component_input.get("condition", False)
    workflow_definition = plugin.workflow_instance.get_json_definition()
    component = find_component_in_tree(workflow_definition, plugin.component.component_id)
    if condition:
        condition_flow = component['config']['branch'].get('True', {})
    else:
        condition_flow = component['config']['branch'].get('False', {})
    
    # find entry point
    entry_point = None
    for key, value in condition_flow.items():
        if value.get('conditions', {}).get("is_entry", False):
            entry_point = value
            break

    output_data = {
        'condition_result': condition,
    }
    if entry_point is None:
        plugin.set_output(True, data=output_data)
        return

    output_data['next_component_id'] = entry_point['id']
    plugin.set_output(True, data=output_data)
    return True


from bwf_core.workflow.base_plugin import LoopPlugin
from bwf_core.components.tasks import find_component_in_tree


def execute(plugin:LoopPlugin):
    inputs = plugin.collect_context_data()
    component_input = inputs['input']
    items = component_input.get("items", False)
    items = component_input.get("items", False)
    workflow_definition = plugin.workflow_instance.get_json_definition()
    component = find_component_in_tree(workflow_definition, plugin.component.component_id)
    loop_flow = component['config']['loop'].get('flow', {})
        
    # find entry point
    entry_point = None
    for key, value in loop_flow.items():
        if value.get('conditions', {}).get("is_entry", False):
            entry_point = value
            break
    if entry_point is None:
        plugin.set_output(True)
        return
    plugin.set_output(True, data={
        'next_component_id': entry_point['id'],
    })
    return True


from bwf_core.workflow.base_plugin import LoopPlugin
from bwf_core.components.tasks import find_component_in_tree
from bwf_core.tasks import register_workflow_step
from bwf_core.components.tasks import find_component_in_tree
import logging

logger = logging.getLogger(__name__)


def execute(plugin:LoopPlugin):
    inputs = plugin.collect_context_data()
    component_input = inputs['input']
    items = component_input.get("items", [])
    index = plugin.options.get("index", 0)

    # check if loop is finished
    if index > len(items) or len(items) == 0:
        plugin.set_output(True)
        return
    
    logger.info(f"Loop plugin: {plugin.component.component_id} - index: {index} - items length: {len(items)}")
    if not plugin.component.options:
        plugin.component.options = {
            "context": {}
        }
        plugin.component.save()
    plugin.component.options['context'] = {
        "index": index,
        "item": items[index],
    }
    plugin.component.save()

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

    register_workflow_step(plugin.workflow_instance,
                            step=entry_point['id'],
                            parent_node_instance=plugin.component)

from bwf_components.types import AbstractPluginHandler

def execute(plugin:AbstractPluginHandler):
    context = plugin.collect_context_data()
    component_input = context['input']
    
    key = component_input.get("local_variable_key")

    plugin.update_workflow_variable(key, component_input.get("value"))
    plugin.set_output(True)
    
    return plugin
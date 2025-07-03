from bwf_components.types import AbstractPluginHandler

def execute(plugin:AbstractPluginHandler):
    inputs = plugin.collect_context_data()
    component_input = inputs['input']
    multi_variables = component_input.get("variables", [])
    if not multi_variables:
        multi_variables = []
    try:
        for variable in multi_variables:
            key = variable.get("local_variable_key")
            value = variable.get("value")
            plugin.update_workflow_variable(key, value)
        plugin.set_output(True)
    except Exception as e:
        plugin.set_output(False, message=str(e))
    



def create_component_definition(name="component", component_type="node", description=None):
    definition = {
        "name": name,
        "type": component_type,
        "description": description or "",
        "config": {
            "inputs": [],
            "outputs": [],
            "routing": [],
            "settings": {},
        },
    }
    return definition
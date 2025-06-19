from django.template import engines
import json
import logging
import ast

from bwf_core.workflow.dto.component_dto import eval_conditional_expression

logger = logging.getLogger(__name__)


def process_base_input_definition(input_item, input_index):
    new_input = {
        "name": input_item.get("label"),
        "key": input_item.get("key"),
        "data_type": input_item.get("type"),
        "value": "",
        "json_value": {
            "type": input_item.get("type"),
            "options": input_item.get("options", None),
            "value_rules": input_item.get("value_rules"),
        },
        "order": input_index,
        "required": input_item.get("required", False),
    }

    structure = input_item.get("value_rules", {}).get("structure", {})
    if input_item.get("type") == "array":
        if structure != {}:
            new_input["json_value"]["multi"] = True

    new_input["json_value"]["dynamic"] = input_item.get("value_rules", {}).get(
        "dynamic", False
    )
    if len(structure.items()) > 0:
        new_input["json_value"]["structure"] = {}
        structure_index = 0
        for key, value in structure.items():
            new_input["json_value"]["structure"][key] = process_base_input_definition(
                value, structure_index
            )
            structure_index += 1

    return new_input


def adjust_workflow_routing(
    workflow_components, instance_id, route, insert_before=None
):
    instance = workflow_components[instance_id]
    if route and route in workflow_components:
        node_before = workflow_components[route]
        oririginal_route = insert_before

        new_route = {
            "condition": None,
            "action": "route",
            "label": "",
            "route": instance_id,
        }
        node_before["routing"].append(new_route)
        instance["config"]["incoming"] = get_incoming_values(
            node_before["config"]["outputs"]
        )

        if oririginal_route and oririginal_route in workflow_components:
            node_next = workflow_components[oririginal_route]
            # remove the next route from the node_before routing
            node_before["routing"] = [
                node
                for node in node_before["routing"]
                if node["route"] != insert_before
            ]

            instance["routing"] = [
                {
                    "condition": None,
                    "action": "route",
                    "label": "",
                    "route": oririginal_route,
                }
            ]
            node_next["config"]["incoming"] = get_incoming_values(
                instance["config"]["outputs"]
            )


def get_incoming_values(config_outputs):
    if not config_outputs:
        return []
    incoming_values = []
    for output in config_outputs:
        incoming_values.append(
            {
                "label": output["label"],
                "key": output["key"],
                "data_type": output["data_type"],
                "data": output.get("data", None),
            }
        )

    return incoming_values


def is_default_route(routing):
    if not routing:
        return False
    condition = routing.get("condition", None)
    if not condition:
        return True

    if not condition.get("is_expression", False) and not condition.get("value", None):
        return True
    if not condition.get("value_ref", None):
        return True
    return False


""" 
    Calculates the next route for a component based on the routing array conditions.
"""


def calculate_next_node(node, workflow_context):
    routing = node.get("routing", None)
    name = node.get("name", None)
    logger.info(f"Evaluating next route for component {name}.")
    if routing is None:
        raise Exception("Routing not defined")
    default_route = None
    for i in range(len(routing)):
        route = routing[i]
        logger.info(
            f"Route #{i+1} {route['label']} with conditions {route.get('condition', {})}"
        )
        if not route.get("condition", None):
            if default_route is None:
                logger.info(
                    f"Route #{i+1} {route['route']} has no conditions, using it as default"
                )
                default_route = route.get("route")
            else:
                logger.warning(
                    f"Route #{i+1} {route['route']} has no conditions, but a default route is already set to {default_route}."
                )
            continue

        condition = route.get("condition", {})
        if condition.get("value_ref", None):
            value_ref = condition.get("value_ref", {})
            id = value_ref.get("id", None)
            key = value_ref.get("key", None)
            param = id if id else key if key else None
            if not param:
                raise Exception("Invalid value reference")
            if workflow_context[value_ref["context"]].get(param, None) == True:
                logger.info(f"Route #{i+1} {route['route']} evaluated to True")
                return route.get("route")
        elif condition.get("is_expression", False):
            expression = condition.get("value", "")
            logger.info(f"Evaluating expression {expression}")
            try:
                result = evaluate_boolean_expression(expression, workflow_context)
                if result:
                    logger.info(f"Route #{i+1} {route['route']} evaluated to True")
                    return route.get("route")
            except Exception as e:
                logger.error(f"Error evaluating expression {expression}: {e}")
                raise Exception(f"Error evaluating expression {expression}: {e}")
        elif condition.get("is_condition", False):
            result = eval_conditional_expression(
                condition, workflow_context
            )

        else:
            if default_route is None:
                logger.info(
                    f"Route #{i+1} {route['route']} has no conditions, using it as default"
                )
                default_route = route.get("route")
            else:
                logger.warning(
                    f"Route #{i+1} {route['route']} has no conditions, but a default route is already set to {default_route}."
                )
            continue
    logger.info(f"No route found for component {name}.")
    return default_route


def evaluate_boolean_expression(expression, workflow_context):
    """
    Evaluates a boolean expression in the context of the workflow.
    """
    try:
        django_engine = engines["django"]
        template = django_engine.from_string(expression)
        result = template.render(workflow_context)
        return result.lower() in ["true", "1", "yes"]
    except Exception as e:
        logger.error(f"Error evaluating boolean expression {expression}: {e}")
        raise Exception(f"Error evaluating boolean expression {expression}: {e}")


def evaluate_expression(expression, data_type, workflow_context):
    """
    Evaluates an expression in the context of the workflow.
    """
    try:

        django_engine = engines["django"]
        template = django_engine.from_string(expression)
        result = template.render(workflow_context)
        return parse_evaluated_expression(result, data_type)
    except Exception as e:
        logger.error(f"Error evaluating expression {expression}: {e}")
        raise Exception(f"Error evaluating expression {expression}: {e}")


def parse_evaluated_expression(result, data_type):
    """
    Parse the evaluated expression result based on the data type.
    """
    if data_type == ["int", "integer", "number"]:
        return int(result)
    elif data_type == ["float", "double"]:
        return float(result)
    elif data_type in ["bool", "boolean"]:
        return bool(result)
    elif data_type == "list":
        return list(ast.literal_eval(result))
        # return list(result)
    elif data_type == "dict":
        return dict(result)
    elif data_type == "array" or data_type == "object":
        return ast.literal_eval(result)
    else:
        return result

from django.template import engines
from bwf_core import exceptions as bwf_exceptions
import json
import logging

logger = logging.getLogger(__name__)


class ComponentDto:
    def __init__(
        self,
        id,
        name,
        plugin_id,
        version_number,
        config,
        conditions,
        workflow_instance=None,
        workflow_context={},
    ):
        self.id = id
        self.name = name
        self.plugin_id = plugin_id
        self.version_number = version_number
        self.inputs = {}
        self.outputs = {}
        self.config = config
        self.conditions = conditions
        self.workflow_context = workflow_context
        self.workflow_instance = workflow_instance

    def get_inputs(self):
        if not self.inputs:
            self.inputs = self.eval_inputs(
                self.config["inputs"], self.workflow_context, plugin_id=self.plugin_id
            )
        return self.inputs


    def eval_inputs(self, component_inputs, workflow_context={}, plugin_id=""):
        from bwf_core.components.utils import evaluate_expression

        inputs_evaluated = {}
        for input in component_inputs:
            data_type = input.get("data_type", None)
            try:
                new_input = {
                    "key": input["key"],
                    "value": None,
                }
                if not input["value"]:
                    pass
                elif input.get("json_value", {}).get("multi", False):
                    if isinstance(input["value"], list):
                        new_input["value"] = []
                        for fields in input["value"]:
                            fields_list = []
                            for field in fields:
                                fields_list.append(fields[field])
                            new_input["value"].append(
                                self.eval_inputs(fields_list, workflow_context, plugin_id)
                            )
                elif input.get("value").get("is_expression"):
                    expression = input["value"].get("value", "")
                    new_input["value"] = evaluate_expression(
                        expression, data_type, workflow_context
                    )
                elif input.get("value").get("is_condition", False):
                    new_input["value"] = self.eval_conditional_expression(
                        input, workflow_context, plugin_id
                    )
                elif input.get("value").get("value_ref"):
                    value_ref = input["value"]["value_ref"]
                    # TODO: validate context value
                    id = value_ref.get("id", None)
                    key = value_ref.get("key", None)
                    param = id if id else key if key else None
                    if not param:
                        raise Exception("Invalid value reference")
                    new_input["value"] = workflow_context[value_ref["context"]].get(
                        param, None
                    )
                else:
                    new_input["value"] = input["value"]["value"]
                inputs_evaluated[new_input["key"]] = new_input["value"]
            except Exception as e:
                raise bwf_exceptions.ComponentInputsEvaluationException(
                    f"Error evaluating input in plugin '{plugin_id}' value for '{input['key']}': {str(e)}",
                    input["key"],
                )
        return inputs_evaluated


    def eval_conditional_expression(self, input, workflow_context, plugin_id=""):
        from bwf_core.workflow.utils import get_variable_info, get_input_info

        conditions = input["value"].get("value", [])
        expression_value = True
        values = {}
        workflow_definition = self.workflow_instance.get_json_definition()
        for condition in conditions:
            left_value = condition.get("left_value", {})
            left_value_data_type = "string"
            if left_value.get("value_ref", None):
                value_ref = left_value.get("value_ref", {})
                id = value_ref.get("id", None)
                key = value_ref.get("key", None)
                context = value_ref.get("context", None)
                context_function = get_variable_info if context == "variables" else get_input_info
                value_from_ref = context_function(workflow_definition=workflow_definition, id=id, key=key)
                if value_from_ref:
                    left_value_data_type = value_from_ref.get("data_type", "string")

            result = self.eval_inputs(
                [
                    {
                        "key": "left_value",
                        "data_type": left_value_data_type,
                        "value": condition.get("left_value", None),
                    }
                ],
                workflow_context,
                plugin_id,
            )
            values.update(**result)
            right_value = condition.get("right_value", {})
            if right_value:
                result = self.eval_inputs(
                    [
                        {
                            "key": "right_value",
                            "data_type": "string",
                            "value": condition.get("right_value", None),
                        }
                    ],
                    workflow_context,
                    plugin_id,
                )
                values.update(**result)
            
            condition_value = condition.get("condition", None)
            operand = condition.get("operand", None)

            evaluation = compare_values(
                {"value": values["left_value"], "data_type": "string"}, 
                condition_value, 
                {"value": values["right_value"], "data_type": ""} if right_value else None, 
                
            )
            expression_value = (
                (expression_value and evaluation)
                if operand == "and"
                else (expression_value or evaluation)
            )
        return expression_value


def compare_values(left_value, condition, right_value):
    from bwf_core.components.utils import parse_evaluated_expression

    if not left_value or not condition:
        raise Exception(
            "Invalid conditional expression: left_value or condition is None"
        )

    left_value_val = left_value.get("value")
    first_value_data_type = left_value.get("data_type")
    right_value_val = right_value.get("value")
    if condition in [COND_IS_EMPTY, COND_IS_NOT_EMPTY, COND_IS_NONE, COND_IS_NOT_NONE]:
        if condition == COND_IS_EMPTY:
            return left_value_val == [] or left_value_val == {} or left_value_val == ""
        elif condition == COND_IS_NOT_EMPTY:
            return left_value_val != [] or left_value_val != {} or left_value_val != ""
        elif condition == COND_IS_NONE:
            return left_value_val is None
        elif condition == COND_IS_NOT_NONE:
            return left_value_val is not None
    if condition == COND_EQUAL_TO:
        return left_value == parse_evaluated_expression(
            right_value_val, first_value_data_type
        )
    elif condition == COND_NOT_EQUAL_TO:
        return left_value_val != right_value_val
    elif condition == COND_GREATER_THAN:
        return left_value_val > right_value_val
    elif condition == COND_LESS_THAN:
        return left_value_val < right_value_val
    elif condition == COND_GREATER_THAN_OR_EQUAL_TO:
        return left_value_val >= right_value_val
    elif condition == COND_LESS_THAN_OR_EQUAL_TO:
        return left_value_val <= right_value_val

    elif condition == COND_TYPE_OF:
        if right_value_val == "string":
            return isinstance(left_value_val, str)
        elif right_value_val == "number":
            return isinstance(left_value_val, (int, float))
        elif right_value_val == "boolean":
            return isinstance(left_value_val, bool)
        elif right_value_val in ["array", "list"]:
            return isinstance(left_value_val, list)
        elif right_value_val == "object":
            return isinstance(left_value_val, dict)
        else:
            raise Exception(f"Unknown type condition: {right_value_val}")
    elif condition == COND_CONTAINS:
        if isinstance(left_value_val, str):
            return right_value_val in left_value_val
        elif isinstance(left_value_val, list):
            return right_value_val in left_value_val
        elif isinstance(left_value_val, dict):
            return right_value_val in left_value_val.values()
    elif condition == COND_NOT_CONTAINS:
        if isinstance(left_value_val, str):
            return right_value_val not in left_value_val
        elif isinstance(left_value_val, list):
            return right_value_val not in left_value_val
        elif isinstance(left_value_val, dict):
            return right_value_val not in left_value_val.values()
    elif condition == COND_STARTS_WITH:
        if isinstance(left_value_val, str):
            return left_value_val.startswith(right_value_val)
        else:
            raise Exception("Condition 'starts_with' can only be used with strings")
    elif condition == COND_ENDS_WITH:
        if isinstance(left_value_val, str):
            return left_value_val.endswith(right_value_val)
        else:
            raise Exception("Condition 'ends_with' can only be used with strings")
    else:
        logger.error(f"Unknown condition: {condition}")
        raise Exception(f"Unknown condition: {condition}")
    return False




COND_EQUAL_TO = "equals"
COND_NOT_EQUAL_TO = "not_equals"
COND_GREATER_THAN = "greater_than"
COND_LESS_THAN = "less_than"
COND_GREATER_THAN_OR_EQUAL_TO = "gte"
COND_LESS_THAN_OR_EQUAL_TO = "lte"
COND_TYPE_OF = "type_of"
COND_CONTAINS = "contains"

COND_NOT_CONTAINS = "not_contains"
COND_STARTS_WITH = "starts_with"
COND_ENDS_WITH = "ends_with"
COND_IS_EMPTY = "is_empty"
COND_IS_NOT_EMPTY = "is_not_empty"
COND_IS_NONE = "is_none"
COND_IS_NOT_NONE = "is_not_none"

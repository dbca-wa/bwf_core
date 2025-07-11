from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.viewsets import ViewSet

from .utils import get_incoming_values
from bwf_core.workflow.serializers import component_serializers
from bwf_core.models import WorkflowVersion, Workflow, WorkflowTypesEnum
from bwf_core.controller.controller import BWFPluginController
from bwf_core.components import serializers
from bwf_core.components.tasks import (
    create_component_definition_instance,
    apply_workflow_entry_removal,
    add_predefined_workflow_inputs,
    update_mapping_from_deleted_component,
    insert_node_to_workflow,
    to_ui_workflow_node,
    list_workflow_nodes,
    find_component_in_tree,
    get_encasing_flow,
    get_parent_node,
)
from .utils import (
    is_default_route,
)

# Create your views here.


class WorkflowComponentViewset(ViewSet):
    def retrieve(self, request, *args, **kwargs):
        workflow_id = request.query_params.get("workflow_id", None)
        version_id = request.query_params.get("version_id", None)
        component_id = kwargs.get("pk", None)
        workflow = get_object_or_404(
            WorkflowVersion, id=version_id, workflow__id=workflow_id
        )
        workflow_definition = workflow.get_json_definition()
        component = find_component_in_tree(workflow_definition, component_id)
        if not component:
            raise Exception("Component not found")
        instance = to_ui_workflow_node(component)
        # TODO: Missing parent info
        return Response(
            component_serializers.WorkflowComponentSerializer(instance).data
        )

    def list(self, request, *args, **kwargs):
        workflow_id = request.query_params.get("workflow_id", None)
        version_id = request.query_params.get("version_id", None)
        workflow = get_object_or_404(
            WorkflowVersion, id=version_id, workflow__id=workflow_id
        )
        workflow_definition = workflow.get_json_definition()
        workflow_components = workflow_definition.get("workflow", {})
        components_list = list_workflow_nodes(workflow_components)
        return Response(
            component_serializers.WorkflowComponentSerializer(
                components_list, many=True
            ).data
        )

    def create(self, request, *args, **kwargs):
        serializer = component_serializers.CreateComponentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workflow_id = serializer.validated_data.get("workflow_id")
        version_id = serializer.validated_data.get("version_id")
        workflow = get_object_or_404(
            WorkflowVersion, id=version_id, workflow__id=workflow_id
        )

        if not workflow.is_editable:
            return Response(
                {"error": "Workflow version cannot be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        workflow_definition = workflow.get_json_definition()
        workflow_components = workflow_definition.get("workflow", {})

        plugin_id = serializer.validated_data.get("plugin_id")
        name = serializer.validated_data.get("name", "Node")
        route = serializer.validated_data.get("route", None)
        version_number = serializer.validated_data.get("version_number", "1")
        is_entry = serializer.validated_data.get("is_entry", False)
        instance = create_component_definition_instance(
            plugin_id, name, route, version_number
        )
        new_inputs = add_predefined_workflow_inputs(
            workflow_definition, plugin_id=plugin_id, component_id=instance["id"]
        )

        parent_id = serializer.validated_data.get("parent_id", None)
        node_path = serializer.validated_data.get("path", None)
        insert_before = serializer.validated_data.get("insert_before", None)

        insert_node_to_workflow(
            workflow_definition,
            instance,
            data={
                "route": route,
                "is_entry": is_entry,
                "node_path": node_path,
                "parent_id": parent_id,
                "insert_before": insert_before,
            },
        )

        workflow_definition["workflow"] = workflow_components
        workflow.set_json_definition(workflow_definition)
        parent_info = {
            "parent_id": parent_id,
            "node_path": node_path,
        }
        instance = to_ui_workflow_node(instance, parent_info=parent_info)
        instance.update({"refresh_inputs": len(new_inputs) > 0})
        return Response(
            component_serializers.WorkflowComponentSerializer(instance).data
        )

    @action(detail=True, methods=["PUT"])
    def update_component(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateComponentSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            key = serializer.validated_data.get("key")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            value = serializer.validated_data.get(
                "value", {"value": None, "is_expression": False, "value_ref": None}
            )

            workflow = get_object_or_404(
                WorkflowVersion, id=version_id, workflow__id=workflow_id
            )

            if not workflow.is_editable:
                return Response(
                    {"error": "Workflow version cannot be edited"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version
            component["name"] = serializer.validated_data.get("name", component["name"])
            if serializer.validated_data.pop("is_remove_config", False):
                component["conditions"]["on_fail"] = {}
            else:
                component["conditions"]["on_fail"] = serializer.validated_data.get(
                    "on_fail", component["conditions"].get("on_fail", {})
                )
            if serializer.validated_data.get("position", None):
                x = serializer.validated_data.get("position", {}).get("x", None)
                y = serializer.validated_data.get("position", {}).get("y", None)
                component["ui"]["x"] = x if x else component["ui"]["x"]
                component["ui"]["y"] = y if y else component["ui"]["y"]
            workflow.set_json_definition(workflow_definition)
            return JsonResponse(
                component_serializers.WorkflowComponentSerializer(
                    to_ui_workflow_node(component)
                ).data
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["PUT"])
    def update_routing(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateRoutingSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            new_index = serializer.validated_data.get("index")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            condition = serializer.validated_data.get(
                "value", {"value": None, "is_expression": False, "value_ref": None}
            )

            workflow = get_object_or_404(
                WorkflowVersion, id=version_id, workflow__id=workflow_id
            )

            if not workflow.is_editable:
                return Response(
                    {"error": "Workflow version cannot be edited"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version

            route = serializer.validated_data.get("route")
            index = -1
            routing = component.get("routing", [])
            for i in range(len(routing)):
                if routing[i]["route"] == route:
                    index = i
                    break

            if serializer.validated_data.pop("is_remove", False):
                if index == -1:
                    raise Exception("Route not found")
                component["routing"].pop(index)
            elif new_index is not None:
                affected_route = routing.pop(index)
                routing.insert(new_index, affected_route)
            else:
                condition = serializer.validated_data.get("condition", None)
                if (
                    isinstance(condition, dict)
                    and condition.get("is_condition", False)
                    and condition.get("value", [])
                ):
                    if len(condition["value"]) == 0:
                        condition = None
                if index == -1:
                    workflow_components = get_encasing_flow(
                        workflow_definition, component_id
                    )
                    is_sibling = False
                    for sKey, sibling_component in workflow_components.items():
                        if sibling_component["id"] == route:
                            is_sibling = True
                            break
                    if not is_sibling:
                        raise Exception("Route component not found in the same level")
                    component["routing"].append(
                        {
                            "route": route,
                            "label": serializer.validated_data.get("label", None),
                            "action": serializer.validated_data.get("action", None),
                            "condition": serializer.validated_data.get(
                                "condition", None
                            ),
                        }
                    )
                else:
                    component["routing"][index]["label"] = (
                        serializer.validated_data.get(
                            "label", component["routing"][index]["label"]
                        )
                    )
                    component["routing"][index]["action"] = (
                        serializer.validated_data.get(
                            "action", component["routing"][index]["action"]
                        )
                    )
                    component["routing"][index]["condition"] = condition

            workflow.set_json_definition(workflow_definition)
            return JsonResponse(
                component_serializers.WorkflowComponentSerializer(
                    to_ui_workflow_node(component)
                ).data
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["PUT"])
    def update_input_value(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateComponentInputSerializer(
                data=request.data
            )
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            key = serializer.validated_data.get("key")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            value = serializer.validated_data.get(
                "value",
                {
                    "value": None,
                    "is_expression": False,
                    "value_ref": None,
                    "is_condition": False,
                    "syntax": None,
                },
            )

            workflow = get_object_or_404(
                WorkflowVersion, id=version_id, workflow__id=workflow_id
            )

            if not workflow.is_editable:
                return Response(
                    {"error": "Workflow version cannot be edited"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version
            input_instance = {}
            inputs = component["config"]["inputs"]
            for input_item in inputs:
                if input_item["key"] == key:
                    input_item["value"] = value
                    input_instance = input_item
                    break

            workflow.set_json_definition(workflow_definition)
            return JsonResponse(input_instance)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        workflow_id = request.query_params.get("workflow_id", None)
        version_id = request.query_params.get("version_id", None)
        components_affected = []
        try:
            workflow = get_object_or_404(
                WorkflowVersion, id=version_id, workflow__id=workflow_id
            )
            if not workflow.is_editable:
                return Response(
                    {"error": "Workflow version cannot be edited"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            workflow_definition = workflow.get_json_definition()
            component_id = kwargs.get("pk", None)
            parent_node = get_parent_node(workflow_definition, component_id)
            workflow_components = get_encasing_flow(workflow_definition, component_id)

            instance = workflow_components.pop(component_id, None)
            workflow_definition["mapping"].pop(component_id, None)
            update_mapping_from_deleted_component(workflow_definition, component_id)
            if not instance:
                return Response("Component not found")

            is_entry_point = instance.get("conditions", {}).get("is_entry", False)
            next_entry_point = None
            if is_entry_point:
                if instance["routing"] and len(instance["routing"]) > 0:
                    next_entry_point = instance["routing"][0]["route"]

            for key, component in workflow_components.items():
                if component["id"] == component_id:
                    continue
                if key == next_entry_point:
                    # if the next entry point is the one to be deleted, we need to set the next one as entry point
                    component["conditions"]["is_entry"] = True

                paths = [r["route"] for r in component["routing"]]
                if not component_id in paths:
                    continue
                was_modified = False
                new_routing = []
                for route in component["routing"]:
                    if not route.get("route", None):
                        # clean invalid routes
                        was_modified = True
                        continue
                    if route["route"] != component_id:
                        new_routing.append(route)
                    else:
                        if is_default_route(route):
                            for after_route in instance["routing"]:
                                if after_route["route"] in paths:
                                    # already exists
                                    continue
                                if after_route["route"] == component["id"]:
                                    # skips self
                                    continue
                                if not is_default_route(after_route):
                                    # skips non default routes
                                    continue
                                new_routing.append(after_route)
                component["routing"] = new_routing
                components_affected.append(component)

            # Remove predefined inputs
            workflow_inputs = workflow_definition.get("inputs", {})
            inputs_to_remove = []
            for key, input_item in workflow_inputs.items():
                if input_item.get("parent_component", None) == component_id:
                    inputs_to_remove.append(key)
                    is_input = True
                    id = input_item.get("id", None)
                    apply_workflow_entry_removal(
                        workflow_definition.get("workflow", {}), is_input, key, id
                    )
            for key in inputs_to_remove:
                workflow_inputs.pop(key, None)
            workflow.set_json_definition(workflow_definition)
            components_affected_to_ui = []
            parent_info = (
                {
                    "parent_id": parent_node["id"],
                    "node_path": parent_node["config"]["path"],
                }
                if parent_node
                else None
            )
            for component in components_affected:
                component_ui = to_ui_workflow_node(component, parent_info=parent_info)
                components_affected_to_ui.append(component_ui)
            return Response(
                component_serializers.WorkflowComponentSerializer(
                    components_affected_to_ui, many=True
                ).data
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PluginsCatalogueView(ListAPIView):
    def get(self, request):
        workflow_id = request.query_params.get("workflow_id", None)
        search_term = request.query_params.get("search", None)
        plugin_type = None

        if workflow_id:
            cached_value = cache.get(f"workflow.basic_info.{workflow_id}")
            if not cached_value:
                workflow = Workflow.objects.get(id=workflow_id)
                cached_value = {
                        "workflow_id": workflow_id,
                        "name": workflow.name,
                        "workflow_type": workflow.workflow_type,
                    }
                cache.set(
                    f"workflow.basic_info.{workflow_id}",
                    cached_value,
                    timeout=60 * 60,  # Cache for 1 hour
                )
            plugin_type = cached_value.get("workflow_type", '')

        plugins = BWFPluginController.filter_plugins(is_long_lived=plugin_type.lower() == WorkflowTypesEnum.LONG_LIVED.lower(), search=search_term)

        return Response(serializers.PluginDefinitionSerializer(plugins, many=True).data)

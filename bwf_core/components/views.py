from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.viewsets import ViewSet

from .utils import get_incoming_values
from bwf_core.workflow.serializers import component_serializers
from bwf_core.models import  WorkflowVersion
from bwf_core.controller.controller import BWFPluginController
from . import serializers
from .tasks import (create_component_definition_instance,
                    update_mapping_from_deleted_component,
                    insert_node_to_workflow,
                    to_ui_workflow_node,
                    list_workflow_nodes,
                    find_component_in_tree,
                    get_encasing_flow,
                    get_parent_node)

# Create your views here.

class WorkflowComponentViewset(ViewSet):
    def retrieve(self, request, *args, **kwargs):
        workflow_id = request.query_params.get("workflow_id", None)
        version_id = request.query_params.get("version_id", None)
        component_id = kwargs.get("pk", None)
        workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)
        workflow_definition = workflow.get_json_definition()
        component = find_component_in_tree(workflow_definition, component_id)
        if not component:
            raise Exception("Component not found")
        instance = to_ui_workflow_node(component)
        # TODO: Missing parent info
        return Response(component_serializers.WorkflowComponentSerializer(instance).data)
        
    
    
    def list(self, request, *args, **kwargs):
        workflow_id = request.query_params.get("workflow_id", None)
        version_id = request.query_params.get("version_id", None)
        workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)
        workflow_definition = workflow.get_json_definition()
        workflow_components = workflow_definition.get("workflow", {})
        components_list = list_workflow_nodes(workflow_components)        
        return Response(component_serializers.WorkflowComponentSerializer(components_list, many=True).data)

    def create(self, request, *args, **kwargs):
        serializer = component_serializers.CreateComponentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workflow_id = serializer.validated_data.get("workflow_id")
        version_id = serializer.validated_data.get("version_id")
        workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)

        if not workflow.is_editable:
            return Response({"error": "Workflow version cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)

        workflow_definition = workflow.get_json_definition()
        workflow_components = workflow_definition.get("workflow", {})

        plugin_id = serializer.validated_data.get("plugin_id")
        name = serializer.validated_data.get("name", "Node")
        route = serializer.validated_data.get("route", None)
        version_number = serializer.validated_data.get("version_number", "1")
        is_entry = serializer.validated_data.get("is_entry", False)
        instance = create_component_definition_instance(plugin_id, name, route, version_number)

        parent_id = serializer.validated_data.get("parent_id", None)
        node_path = serializer.validated_data.get("path", None)
        
        insert_node_to_workflow(workflow_definition, instance, data={
            'route': route,
            'is_entry': is_entry,
            'node_path': node_path,
            'parent_id': parent_id,
        })

        workflow_definition['workflow'] = workflow_components
        workflow.set_json_definition(workflow_definition)
        parent_info = {
                'parent_id': parent_id,
                'node_path': node_path,
            }
        instance = to_ui_workflow_node(instance, parent_info=parent_info)
        
        return Response(component_serializers.WorkflowComponentSerializer(instance).data)

    @action(detail=True, methods=['PUT'])
    def update_component(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateComponentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            key = serializer.validated_data.get("key")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            value = serializer.validated_data.get("value", {'value': None, 'is_expression': False, 'value_ref': None})

            workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)

            if not workflow.is_editable:
                return Response({"error": "Workflow version cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)
        
            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version
            component['name'] = serializer.validated_data.get("name", component['name'])
            if serializer.validated_data.pop("is_remove_config", False):
                component['conditions']['on_fail'] = {}
            else:
                component['conditions']['on_fail'] = serializer.validated_data.get("on_fail", component['conditions'].get("on_fail", {})) 
            if serializer.validated_data.get("position", None):
                x = serializer.validated_data.get("position", {}).get("x", None)
                y = serializer.validated_data.get("position", {}).get("y", None)
                component['ui']['x'] = x if x else component['ui']['x'] 
                component['ui']['y'] = y if y else component['ui']['y']
            workflow.set_json_definition(workflow_definition)
            return JsonResponse(component_serializers.WorkflowComponentSerializer(to_ui_workflow_node(component)).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['PUT'])
    def update_routing(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateRoutingSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            key = serializer.validated_data.get("key")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            condition = serializer.validated_data.get("value", {'value': None, 'is_expression': False, 'value_ref': None})

            workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)

            if not workflow.is_editable:
                return Response({"error": "Workflow version cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)
           
            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version
            
            route = serializer.validated_data.get("route")
            index = -1
            routing = component.get("routing",[])
            for i in range(len(routing)):
                if routing[i]['route'] == route:
                    index = i
                    break

            if serializer.validated_data.pop("is_remove", False):
                if index == -1:
                    raise Exception("Route not found")
                component['routing'].pop(index)
            else:
                if index == -1:
                    component['routing'].append({
                        'route': route,
                        'label': serializer.validated_data.get("label", None),
                        'action': serializer.validated_data.get("action", None),
                        'condition': serializer.validated_data.get("condition", None)
                    })
                else:
                    component['routing'][index]['label'] = serializer.validated_data.get("label", component['routing'][index]['label'])
                    component['routing'][index]['action'] = serializer.validated_data.get("action", component['routing'][index]['action'])
                    component['routing'][index]['condition'] = serializer.validated_data.get("condition", component['routing'][index]['condition'])
                
            
            workflow.set_json_definition(workflow_definition)
            return JsonResponse(component_serializers.WorkflowComponentSerializer(to_ui_workflow_node(component)).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['PUT'])
    def update_input_value(self, request, *args, **kwargs):
        try:
            serializer = component_serializers.UpdateComponentInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            component_id = kwargs.get("pk", None)
            workflow_id = serializer.validated_data.get("workflow_id")
            version_id = serializer.validated_data.get("version_id")
            plugin_id = serializer.validated_data.get("plugin_id")
            key = serializer.validated_data.get("key")
            plugin_version = serializer.validated_data.get("plugin_version", None)
            value = serializer.validated_data.get("value", {'value': None, 'is_expression': False, 'value_ref': None})

            workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)

            if not workflow.is_editable:
                return Response({"error": "Workflow version cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)
        
            workflow_definition = workflow.get_json_definition()
            component = find_component_in_tree(workflow_definition, component_id)
            if not component:
                raise Exception("Component not found")
            if component.get("plugin_id") != plugin_id:
                raise Exception("Plugin ID does not match")
            # TODO: Check plugin version
            input_instance = {}
            inputs = component['config']['inputs']
            for input_item in inputs:
                if input_item['key'] == key:
                    input_item['value'] = value
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
            workflow = get_object_or_404(WorkflowVersion, id=version_id, workflow__id=workflow_id)
            if not workflow.is_editable:
                return Response({"error": "Workflow version cannot be edited"}, status=status.HTTP_400_BAD_REQUEST)
        
            workflow_definition = workflow.get_json_definition()
            component_id = kwargs.get("pk", None)
            parent_node = get_parent_node(workflow_definition, component_id)
            workflow_components = get_encasing_flow(workflow_definition, component_id)

            instance = workflow_components.pop(component_id, None)
            workflow_definition['mapping'].pop(component_id, None)
            update_mapping_from_deleted_component(workflow_definition, component_id)
            if not instance:
                return Response("Component not found")
            
            node_prev = None
            for key, component in workflow_components.items():
                if component['conditions']['route'] == component_id:
                    component['conditions']['route'] = None
                    node_prev = component
                    components_affected.append(component)
                    break
            
            route = instance['conditions']['route']
            if route:
                node_next = workflow_components.get(route, None)
                if node_next:
                    components_affected.append(node_next)
                    node_next['conditions']['is_entry'] = instance['conditions']['is_entry']
                    if node_prev:
                        node_prev['conditions']['route'] = node_next['id']
                        node_next['config']['incoming'] = get_incoming_values(node_prev['config']['outputs'])
            elif node_prev:
                node_prev['conditions']['route'] = None

            # workflow_definition['workflow'] = workflow_components
            workflow.set_json_definition(workflow_definition)
            components_affected_to_ui = []
            parent_info = {
                    'parent_id': parent_node['id'],
                    'node_path': parent_node['config']['path'],
                } if parent_node else None
            for component in components_affected:
                component_ui = to_ui_workflow_node(component, parent_info=parent_info)
                components_affected_to_ui.append(component_ui)
            return Response(component_serializers.WorkflowComponentSerializer(components_affected_to_ui, many=True).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

   
class PluginsCatalogueView(ListAPIView):
    def get(self, request):
        plugins = BWFPluginController.get_plugins_list()
        return Response(serializers.PluginDefinitionSerializer(plugins, many=True).data)

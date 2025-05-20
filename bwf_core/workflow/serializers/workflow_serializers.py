from django.utils.translation import gettext_lazy as _

from rest_framework import serializers
from bwf_core.models import Workflow, WorkflowVersion, WorkflowTypesEnum

class ListWorkflowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    workflow_type = serializers.ChoiceField(choices=WorkflowTypesEnum.choices)
    description = serializers.CharField(max_length=1000, required=False, default="", allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    is_active = serializers.BooleanField(default=False)
    is_edition = serializers.BooleanField(default=False)


class CreateWorkflowSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    workflow_type = serializers.ChoiceField(choices=WorkflowTypesEnum.choices)
    description = serializers.CharField(max_length=1000, required=False, default="", allow_blank=True)

class CreateWorkflowVersionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField(required=False)
    

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = "__all__"

class WorkflowBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = ['id', 'name', 'description']

class WorkflowVersionSerializer(serializers.ModelSerializer):
    workflow = WorkflowBasicSerializer()
    class Meta:
        model = WorkflowVersion
        fields = "__all__"


class CreateWorkflowInputSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    label = serializers.CharField(max_length=255)
    key = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    data_type = serializers.CharField(max_length=255)
    default_value = serializers.JSONField(required=False)
    required = serializers.BooleanField(default=False)


class WorkflowInputSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    label = serializers.CharField(max_length=255)
    key = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000, required=False)
    data_type = serializers.CharField(max_length=255)
    default_value = serializers.JSONField(required=False)
    required = serializers.BooleanField(default=False)


class CreateVariableValueSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    key = serializers.CharField(max_length=255)
    data_type = serializers.CharField(max_length=255)
    value = serializers.CharField(max_length=255, required=False, allow_blank=True)
    context = serializers.CharField(max_length=255, required=False)


class VariableValueSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=255)
    key = serializers.CharField(max_length=255)
    data_type = serializers.CharField(max_length=255)
    value = serializers.CharField(max_length=255, required=False)
    context = serializers.CharField(max_length=255, required=False)

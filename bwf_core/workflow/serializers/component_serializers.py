

from rest_framework import serializers



class WorkflowComponentSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    plugin_id = serializers.CharField()
    config = serializers.JSONField() 
    ui = serializers.JSONField(required=False) 
    conditions = serializers.JSONField()
    parent_info = serializers.JSONField(default={})
    node_type = serializers.CharField(default="node")
    # children = serializers.JSONField()

class CreateComponentSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    plugin_id = serializers.CharField(max_length=500)
    plugin_version = serializers.IntegerField(default=1)
    index = serializers.IntegerField(default=1)
    name = serializers.CharField(max_length=100, required=False, allow_null=True)
    route = serializers.CharField(max_length=50, required=False, allow_null=True)
    # conditions = 
    path = serializers.CharField(max_length=500, required=False, allow_null=True)
    parent_id = serializers.CharField(max_length=500, required=False, allow_null=True)
    is_entry = serializers.BooleanField(default=False)


class OnFailConfigSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["terminate", "ignore", "retry", "custom"], required=False)
    max_retries = serializers.IntegerField(required=False, min_value=0, max_value=10, allow_null=True)
    retry_interval = serializers.IntegerField(required=False, min_value=0, max_value=10000, allow_null=True)
    is_remove_config = serializers.BooleanField(default=False)


    def validate(self, data):
        action = data.get("action")
        if action == "retry":
            if data.get("max_retries") is None or data.get("retry_interval") is None:
                raise serializers.ValidationError("max_retries and retry_interval are required when action is 'retry'.")
        elif action == "terminate":
            if data.get("max_retries") is not None or data.get("retry_interval") is not None:
                raise serializers.ValidationError("max_retries and retry_interval should not be provided when action is 'terminate'.")
        return data

class UpdateComponentSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    plugin_id = serializers.CharField(max_length=500)
    plugin_version = serializers.IntegerField(default=1)
    index = serializers.IntegerField(default=1)
    name = serializers.CharField(max_length=100, required=False, allow_null=True)
    on_fail = OnFailConfigSerializer(required=False)


class UpdateComponentInputSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    version_id = serializers.IntegerField()
    plugin_id = serializers.CharField(max_length=500)
    plugin_version = serializers.IntegerField(default=1)
    key = serializers.CharField(max_length=500)
    value = serializers.JSONField()


class PluginDefinitionSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=255)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(max_length=1000)
    version = serializers.CharField(max_length=15)
    icon_class = serializers.CharField(max_length=100)
    base_input = serializers.JSONField(required=False)
    base_output = serializers.JSONField(required=False)


class ComponentInputUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    json_value = serializers.JSONField(required=False)
    expression = serializers.CharField(max_length=1000, required=False)
    value = serializers.JSONField(required=False)

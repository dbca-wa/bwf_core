from rest_framework import serializers

class CreateComponentSerializer(serializers.Serializer):
    workflow_id = serializers.IntegerField()
    name = serializers.CharField(max_length=100, required=False)
    index = serializers.IntegerField(default=1)
    description = serializers.CharField(max_length=1000, required=False)
    plugin_id = serializers.CharField(max_length=500)
    version_number = serializers.IntegerField(default=1)


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

from rest_framework import serializers

from .models import CachedPlace


class PlaceSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    class Meta:
        model = CachedPlace
        fields = [
            'osm_id', 'name', 'category', 'lat', 'lon',
            'description', 'tags', 'photo', 'updated_at',
        ]

    def get_photo(self, obj):
        if isinstance(obj, dict):
            if obj.get('image'):
                from django.conf import settings
                return f'{settings.MEDIA_URL}{obj["image"]}'
            return obj.get('photo_url', '') or ''
        return obj.display_photo

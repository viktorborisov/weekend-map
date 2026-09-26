from rest_framework import serializers

from .models import CachedPlace, VisitedPlace


class PlaceSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()
    visited = serializers.SerializerMethodField()

    class Meta:
        model = CachedPlace
        fields = [
            'osm_id', 'name', 'category', 'lat', 'lon',
            'description', 'tags', 'photo', 'visited', 'updated_at',
        ]

    def get_photo(self, obj):
        if isinstance(obj, dict):
            if obj.get('image'):
                from django.conf import settings
                return f'{settings.MEDIA_URL}{obj["image"]}'
            return obj.get('photo_url', '') or ''
        return obj.display_photo

    def get_visited(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if isinstance(obj, dict):
            osm_id = obj.get('osm_id')
        else:
            osm_id = obj.osm_id
        return VisitedPlace.objects.filter(user=request.user, place__osm_id=osm_id).exists()

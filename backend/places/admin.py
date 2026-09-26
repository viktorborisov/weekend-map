from django.contrib import admin

from .models import CachedPlace


@admin.register(CachedPlace)
class CachedPlaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'lat', 'lon', 'photo_url', 'image')
    list_filter = ('category',)
    search_fields = ('name', 'description')
    readonly_fields = ('updated_at',)

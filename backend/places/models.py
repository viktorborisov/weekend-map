from django.conf import settings
from django.db import models


class CachedPlace(models.Model):
    CATEGORY_CHOICES = [
        ('nature', 'Природа'),
        ('historic', 'Исторические места'),
        ('museum', 'Музеи'),
        ('viewpoint', 'Смотровые площадки'),
        ('tourism', 'Туризм'),
        ('leisure', 'Отдых и развлечения'),
        ('water', 'Водоёмы'),
        ('food', 'Еда и кафе'),
    ]

    osm_id = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=512)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='tourism')
    lat = models.FloatField()
    lon = models.FloatField()
    description = models.TextField(blank=True, default='')
    tags = models.JSONField(default=dict, blank=True)
    photo_url = models.URLField(max_length=1024, blank=True, default='')
    image = models.ImageField(upload_to='places/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['lat', 'lon']),
        ]

    def __str__(self):
        return self.name

    @property
    def display_photo(self):
        if self.image:
            return self.image.url
        return self.photo_url or ''


class VisitedPlace(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='visited_places')
    place = models.ForeignKey(CachedPlace, on_delete=models.CASCADE, related_name='visitors')
    visited_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, default='')

    class Meta:
        unique_together = ('user', 'place')
        ordering = ['-visited_at']

    def __str__(self):
        return f'{self.user.username} — {self.place.name}'

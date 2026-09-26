from django.urls import path

from . import views

urlpatterns = [
    path('places/', views.place_list, name='place-list'),
    path('places/refresh/', views.refresh, name='place-refresh'),
    path('places/<str:osm_id>/', views.place_detail, name='place-detail'),
]

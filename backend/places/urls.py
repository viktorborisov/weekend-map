from django.urls import path

from . import views

urlpatterns = [
    path('places/', views.place_list, name='place-list'),
    path('places/refresh/', views.refresh, name='place-refresh'),
    path('places/<str:osm_id>/', views.place_detail, name='place-detail'),
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/me/', views.current_user, name='current-user'),
    path('visited/', views.visited_list, name='visited-list'),
    path('visited/toggle/', views.toggle_visited, name='toggle-visited'),
]

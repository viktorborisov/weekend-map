import threading

from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .services import refresh_places, get_places
from .serializers import PlaceSerializer
from .models import CachedPlace, VisitedPlace
from .weather import fetch_weather_for_place, get_recommendations


_refresh_lock = threading.Lock()
_refresh_running = {'active': False}

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    email = request.data.get('email', '').strip()

    if not username or not password:
        return Response({'error': 'Введите имя пользователя и пароль'}, status=status.HTTP_400_BAD_REQUEST)
    if len(password) < 6:
        return Response({'error': 'Пароль должен быть не менее 6 символов'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Это имя уже занято'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email or '')
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': {'id': user.id, 'username': user.username},
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Неверное имя пользователя или пароль'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'user': {'id': user.id, 'username': user.username},
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['GET'])
def current_user(request):
    if not request.user.is_authenticated:
        return Response({'user': None})
    return Response({'user': {'id': request.user.id, 'username': request.user.username}})


@api_view(['GET'])
def place_list(request):
    category = request.query_params.get('category', 'all')
    places = get_places(category=category)
    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response({
        'count': len(serializer.data),
        'category': category,
        'places': serializer.data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh(request):
    if _refresh_running['active']:
        return Response({'status': 'already_running'}, status=status.HTTP_409_CONFLICT)

    def _do_refresh():
        try:
            refresh_places()
        finally:
            _refresh_running['active'] = False

    _refresh_running['active'] = True
    thread = threading.Thread(target=_do_refresh, daemon=True)
    thread.start()

    return Response({'status': 'started'}, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
def place_detail(request, osm_id):
    try:
        place = CachedPlace.objects.get(osm_id=osm_id)
    except CachedPlace.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PlaceSerializer(place, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def visited_list(request):
    visited = VisitedPlace.objects.filter(user=request.user).select_related('place')
    return Response({
        'count': visited.count(),
        'visited': [v.place.osm_id for v in visited],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_visited(request):
    osm_id = request.data.get('osm_id')
    if not osm_id:
        return Response({'error': 'osm_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        place = CachedPlace.objects.get(osm_id=osm_id)
    except CachedPlace.DoesNotExist:
        return Response({'error': 'Place not found'}, status=status.HTTP_404_NOT_FOUND)

    visited = VisitedPlace.objects.filter(user=request.user, place=place).first()
    if visited:
        visited.delete()
        return Response({'visited': False, 'osm_id': osm_id})
    else:
        VisitedPlace.objects.create(user=request.user, place=place)
        return Response({'visited': True, 'osm_id': osm_id})


@api_view(['GET'])
@permission_classes([AllowAny])
def weather_recommendations(request):
    try:
        recs = get_recommendations()
        return Response({'recommendations': recs})
    except Exception as e:
        return Response({'error': f'Ошибка получения погоды: {e}'}, status=500)

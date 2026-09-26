import threading

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import refresh_places, get_places
from .serializers import PlaceSerializer

_refresh_lock = threading.Lock()
_refresh_running = {'active': False}


@api_view(['GET'])
def place_list(request):
    category = request.query_params.get('category', 'all')
    places = get_places(category=category)
    serializer = PlaceSerializer(places, many=True)
    return Response({
        'count': len(serializer.data),
        'category': category,
        'places': serializer.data,
    })


@api_view(['POST'])
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
    from .models import CachedPlace
    try:
        place = CachedPlace.objects.get(osm_id=osm_id)
    except CachedPlace.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    serializer = PlaceSerializer(place)
    return Response(serializer.data)

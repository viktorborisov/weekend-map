import time
import logging

import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from .models import CachedPlace

logger = logging.getLogger(__name__)

LENINGRAD_BBOX = '58.3,27.5,61.5,35.5'

OVERPASS_QUERIES = {
    'tourism': '''
        [out:json][timeout:60];
        (
          node["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo"](LENINGRAD_BBOX);
          way["tourism"~"attraction|museum|viewpoint|artwork|gallery|zoo"](LENINGRAD_BBOX);
        );
        out center 200;
    ''',
    'historic': '''
        [out:json][timeout:60];
        (
          node["historic"](LENINGRAD_BBOX);
          way["historic"](LENINGRAD_BBOX);
        );
        out center 200;
    ''',
    'nature': '''
        [out:json][timeout:60];
        (
          node["natural"~"peak|cave|spring|geyser"](LENINGRAD_BBOX);
          way["natural"~"peak|wood|forest|cave|spring|water"](LENINGRAD_BBOX);
          node["leisure"~"park|nature_reserve|garden"](LENINGRAD_BBOX);
          way["leisure"~"park|nature_reserve|garden"](LENINGRAD_BBOX);
        );
        out center 200;
    ''',
    'water': '''
        [out:json][timeout:60];
        (
          way["waterway"~"waterfall|rapids"](LENINGRAD_BBOX);
          node["leisure"~"beach|swimming_area"](LENINGRAD_BBOX);
          way["leisure"~"beach|swimming_area"](LENINGRAD_BBOX);
          way["water"](LENINGRAD_BBOX)["name"];
        );
        out center 200;
    ''',
    'leisure': '''
        [out:json][timeout:60];
        (
          node["leisure"~"sports_centre|stadium|playground|recreation_ground"](LENINGRAD_BBOX);
          way["leisure"~"sports_centre|stadium|playground|recreation_ground"](LENINGRAD_BBOX);
          node["amenity"~"theatre|cinema|arts_centre"](LENINGRAD_BBOX);
        );
        out center 200;
    ''',
    'food': '''
        [out:json][timeout:60];
        (
          node["amenity"~"restaurant|cafe|bar|fast_food"]["name"](LENINGRAD_BBOX);
        );
        out 200;
    ''',
}

CATEGORY_MAP = {
    'tourism_attraction': 'tourism',
    'tourism_museum': 'museum',
    'tourism_viewpoint': 'viewpoint',
    'tourism_artwork': 'tourism',
    'tourism_gallery': 'museum',
    'tourism_zoo': 'leisure',
    'historic': 'historic',
    'natural_peak': 'nature',
    'natural_cave': 'nature',
    'natural_spring': 'nature',
    'natural_geyser': 'nature',
    'natural_wood': 'nature',
    'natural_forest': 'nature',
    'natural_water': 'water',
    'leisure_park': 'nature',
    'leisure_nature_reserve': 'nature',
    'leisure_garden': 'nature',
    'leisure_beach': 'water',
    'leisure_swimming_area': 'water',
    'waterway_waterfall': 'water',
    'waterway_rapids': 'water',
    'leisure_sports_centre': 'leisure',
    'leisure_stadium': 'leisure',
    'leisure_playground': 'leisure',
    'leisure_recreation_ground': 'leisure',
    'amenity_theatre': 'leisure',
    'amenity_cinema': 'leisure',
    'amenity_arts_centre': 'museum',
    'amenity_restaurant': 'food',
    'amenity_cafe': 'food',
    'amenity_bar': 'food',
    'amenity_fast_food': 'food',
}

PRIORITY_KEYWORDS = [
    'водопад', 'гора', 'озеро', 'парк', 'музей', 'крепость', 'дворец',
    'усадьба', 'монастырь', 'церковь', 'собр', 'пад', 'ключ', 'грот',
    'пещера', 'смотровая', 'панорама', 'заповедник', 'заказник',
]

CATEGORY_EMOJI = {
    'nature': '🌿',
    'historic': '🏛️',
    'museum': '🖼️',
    'viewpoint': '👁️',
    'tourism': '⭐',
    'leisure': '🎪',
    'water': '🌊',
    'food': '🍽️',
}


def _determine_category(tags):
    tourism = tags.get('tourism', '')
    historic = tags.get('historic', '')
    natural = tags.get('natural', '')
    leisure = tags.get('leisure', '')
    waterway = tags.get('waterway', '')
    amenity = tags.get('amenity', '')

    for key, val in [
        ('tourism', tourism), ('historic', historic), ('natural', natural),
        ('leisure', leisure), ('waterway', waterway), ('amenity', amenity),
    ]:
        if val:
            map_key = f'{key}_{val}'
            if map_key in CATEGORY_MAP:
                return CATEGORY_MAP[map_key]
    return 'tourism'


def _build_description(tags):
    parts = []
    desc_fields = [
        ('description', 'Описание'),
        ('historic', 'Тип'),
        ('tourism', 'Тип'),
        ('natural', 'Природа'),
        ('leisure', 'Досуг'),
        ('amenity', 'Услуга'),
        ('waterway', 'Водоём'),
        ('opening_hours', 'Часы работы'),
        ('website', 'Сайт'),
        ('phone', 'Телефон'),
    ]
    for key, label in desc_fields:
        val = tags.get(key)
        if val:
            parts.append(f'{label}: {val}')
    return '\n'.join(parts)


def _calculate_score(name, category, tags):
    score = 50
    name_lower = (name or '').lower()
    for kw in PRIORITY_KEYWORDS:
        if kw in name_lower:
            score += 15
            break
    if category in ('nature', 'water', 'viewpoint', 'historic'):
        score += 10
    if tags.get('description'):
        score += 10
    if tags.get('website'):
        score += 5
    if tags.get('wikidata') or tags.get('wikipedia'):
        score += 10
    return score


def _parse_overpass_element(el, query_category):
    tags = el.get('tags', {})
    name = tags.get('name', '')
    if not name:
        return None

    if el['type'] == 'node':
        lat = el.get('lat')
        lon = el.get('lon')
    elif el['type'] == 'way':
        center = el.get('center', {})
        lat = center.get('lat')
        lon = center.get('lon')
    else:
        return None

    if lat is None or lon is None:
        return None

    category = _determine_category(tags)
    osm_id = f"{el['type']}_{el['id']}"
    description = _build_description(tags)
    score = _calculate_score(name, category, tags)

    return {
        'osm_id': osm_id,
        'name': name,
        'category': category,
        'lat': lat,
        'lon': lon,
        'description': description,
        'tags': tags,
        'score': score,
        'emoji': CATEGORY_EMOJI.get(category, '📍'),
    }


def fetch_from_overpass(query_text):
    query = query_text.replace('LENINGRAD_BBOX', LENINGRAD_BBOX)
    try:
        resp = requests.post(
            settings.OVERPASS_API_URL,
            data={'data': query},
            timeout=90,
            headers={'User-Agent': 'weekend-map/1.0'},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get('elements', [])
    except Exception as e:
        logger.error(f'Overpass API error: {e}')
        return []


def refresh_places():
    all_places = []
    for cat, query in OVERPASS_QUERIES.items():
        elements = fetch_from_overpass(query)
        for el in elements:
            parsed = _parse_overpass_element(el, cat)
            if parsed:
                all_places.append(parsed)
        time.sleep(1)

    seen_ids = set()
    unique_places = []
    for p in all_places:
        if p['osm_id'] not in seen_ids:
            seen_ids.add(p['osm_id'])
            unique_places.append(p)

    for p in unique_places:
        CachedPlace.objects.update_or_create(
            osm_id=p['osm_id'],
            defaults={
                'name': p['name'],
                'category': p['category'],
                'lat': p['lat'],
                'lon': p['lon'],
                'description': p['description'],
                'tags': p['tags'],
            },
        )

    return len(unique_places)


def get_places(category=None, min_score=0):
    qs = CachedPlace.objects.all()
    if category and category != 'all':
        qs = qs.filter(category=category)
    return list(qs.values('osm_id', 'name', 'category', 'lat', 'lon', 'description', 'tags', 'photo_url', 'image'))


def is_cache_fresh():
    latest = CachedPlace.objects.order_by('-updated_at').first()
    if not latest:
        return False
    max_age = timedelta(seconds=settings.CACHE_OVERPASS_SECONDS)
    return timezone.now() - latest.updated_at < max_age

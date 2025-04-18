import json

import pokebase as pb
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from api.models import BarterTrade, MoneyTrade, Pokemon
from api.pokeapi import random_pokemon


def index(_):
    data = {"message": "Hello World"}
    return JsonResponse(data)


@require_POST
def login_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        return JsonResponse(
            {"success": True, "user": {"username": user.username, "id": user.id}}
        )
    else:
        return JsonResponse(
            {"success": False, "error": "Invalid credentials"}, status=400
        )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


def user_view(request):
    if request.user.is_authenticated:
        return JsonResponse(
            {
                "isAuthenticated": True,
                "user": {"username": request.user.username, "id": request.user.id},
            }
        )
    return JsonResponse({"isAuthenticated": False})


def user_username(_, username):
    user = get_object_or_404(User, username=username)

    pokemon_queryset = Pokemon.objects.filter(user=user).prefetch_related(
        Prefetch(
            "money_trade_listing",
            queryset=MoneyTrade.objects.filter(status="open"),
            to_attr="open_money_trade_list",
        ),
        Prefetch(
            "barter_trade_listing",
            queryset=BarterTrade.objects.filter(status="open"),
            to_attr="open_barter_trade_list",
        ),
    )

    # Serialize Pokemon data, including prefetched trades
    pokemon_data = []
    for pokemon in pokemon_queryset:
        p_dict = {
            "id": pokemon.id,
            "pokeapi_id": pokemon.pokeapi_id,
            "name": pokemon.name,
            "rarity": pokemon.rarity,
            "image_url": pokemon.image_url,
            "types": pokemon.types,
            "money_trades": [],
            "barter_trades": [],
        }

        # Check if the prefetched list is non-empty
        if pokemon.open_money_trade_list:
            trade = pokemon.open_money_trade_list[0]
            p_dict["money_trades"] = [
                {
                    "id": trade.id,
                    "amount_asked": trade.amount_asked,
                    "status": trade.status,
                }
            ]

        # Check if the prefetched list is non-empty
        if pokemon.open_barter_trade_list:
            trade = pokemon.open_barter_trade_list[0]
            p_dict["barter_trades"] = [
                {
                    "id": trade.id,
                    "trade_preferences": trade.trade_preferences,
                    "status": trade.status,
                }
            ]

        pokemon_data.append(p_dict)

    money_trades = list(
        MoneyTrade.objects.filter(pokemon__user=user, status="open").values(
            "id", "amount_asked", "status", "pokemon__id", "pokemon__name"
        )
    )
    barter_trades = list(
        BarterTrade.objects.filter(pokemon__user=user, status="open").values(
            "id", "trade_preferences", "status", "pokemon__id", "pokemon__name"
        )
    )

    return JsonResponse(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
            },
            "pokemon": pokemon_data,
            "open_trades": {
                "money_trades": money_trades,
                "barter_trades": barter_trades,
            },
        }
    )


@require_POST
def signup_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")
    email = data.get("email", "")

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "error": "Username already exists"}, status=400
        )

    user = User.objects.create_user(username=username, email=email, password=password)
    user_pokemon = []

    for _ in range(5):
        pokeapi_data = random_pokemon()
        pokemon_name = pokeapi_data.name
        pokemon_id = pokeapi_data.id
        pokemon_types = [t.type.name for t in pokeapi_data.types]

        image_url = None
        if hasattr(pokeapi_data.sprites.other, "official_artwork"):
            official_artwork = pokeapi_data.sprites.other.official_artwork
            if (
                hasattr(official_artwork, "front_default")
                and official_artwork.front_default
            ):
                image_url = official_artwork.front_default

        if not image_url and hasattr(pokeapi_data.sprites, "front_default"):
            image_url = pokeapi_data.sprites.front_default

        species_data = pb.pokemon_species(pokemon_id)
        capture_rate = species_data.capture_rate
        if capture_rate <= 10:
            rarity = 5
        elif capture_rate <= 30:
            rarity = 4
        elif capture_rate <= 70:
            rarity = 3
        elif capture_rate <= 150:
            rarity = 2
        else:
            rarity = 1

        pokemon_instance = Pokemon(
            user=user,
            pokeapi_id=pokemon_id,
            name=pokemon_name,
            rarity=rarity,
            image_url=image_url,
            types=pokemon_types,
        )
        user_pokemon.append(pokemon_instance)

    Pokemon.objects.bulk_create(user_pokemon)

    return JsonResponse(
        {
            "success": True,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        },
        status=201,
    )

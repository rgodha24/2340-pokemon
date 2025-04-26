import json
import pokebase as pb
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Pokemon, TradeRequest
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import user_passes_test
from django.utils import timezone
from django.db.models import Q
from .models import MoneyTrade, BarterTrade, TradeHistory, TradeReport


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

        # Get or create user profile to access money
        try:
            profile = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=user)

        return JsonResponse(
            {
                "success": True,
                "user": {
                    "username": user.username,
                    "id": user.id,
                    "money": profile.money,
                },
            }
        )
    else:
        return JsonResponse(
            {"success": False, "error": "Invalid credentials"}, status=400
        )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


def search_marketplace(request):
    query = request.GET.get("q", "").strip().lower()
    results = []

    if query:
        pokemon_queryset = Pokemon.objects.filter(
            Q(name__icontains=query),
            Q(money_trade_listing__isnull=False)
            | Q(barter_trade_listing__isnull=False),
        ).select_related("user")

        for p in pokemon_queryset:
            results.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "image_url": p.image_url,
                    "rarity": p.rarity,
                    "types": p.types,
                    "owner": {"id": p.user.id, "username": p.user.username},
                    "money_trade": {
                        "id": p.money_trade_listing.id,
                        "amount_asked": p.money_trade_listing.amount_asked,
                    }
                    if hasattr(p, "money_trade_listing")
                    else None,
                    "barter_trade": {
                        "id": p.barter_trade_listing.id,
                        "trade_preferences": p.barter_trade_listing.trade_preferences,
                    }
                    if hasattr(p, "barter_trade_listing")
                    else None,
                }
            )

    return JsonResponse({"success": True, "results": results})


@require_GET
@login_required
def user_notifications(request):
    notifications = Notification.objects.filter(user=request.user).order_by(
        "-created_at"
    )
    return JsonResponse(
        {
            "success": True,
            "notifications": [
                {
                    "id": n.id,
                    "message": n.message,
                    "link": n.link,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notifications
            ],
        }
    )


@require_POST
@login_required
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"success": True})


def filter_marketplace(request):
    rarity = request.GET.get("rarity")
    max_price = request.GET.get("max_price")
    ptype = request.GET.get("type")

    queryset = Pokemon.objects.filter(
        Q(money_trade_listing__isnull=False) | Q(barter_trade_listing__isnull=False)
    ).select_related("user")

    if rarity:
        queryset = queryset.filter(rarity=int(rarity))

    if max_price:
        queryset = queryset.filter(
            money_trade_listing__amount_asked__lte=int(max_price)
        )

    if ptype:
        queryset = queryset.filter(types__icontains=ptype.lower())

    results = []
    for p in queryset:
        results.append(
            {
                "id": p.id,
                "name": p.name,
                "image_url": p.image_url,
                "rarity": p.rarity,
                "types": p.types,
                "owner": {"id": p.user.id, "username": p.user.username},
                "money_trade": {
                    "id": p.money_trade_listing.id,
                    "amount_asked": p.money_trade_listing.amount_asked,
                }
                if hasattr(p, "money_trade_listing")
                else None,
                "barter_trade": {
                    "id": p.barter_trade_listing.id,
                    "trade_preferences": p.barter_trade_listing.trade_preferences,
                }
                if hasattr(p, "barter_trade_listing")
                else None,
            }
        )

    return JsonResponse({"success": True, "results": results})


def user_view(request):
    if request.user.is_authenticated:
        # Get or create user profile to access money
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            profile = Profile.objects.create(user=request.user)

        return JsonResponse(
            {
                "isAuthenticated": True,
                "user": {
                    "username": request.user.username,
                    "id": request.user.id,
                    "money": profile.money,
                },
            }
        )
    return JsonResponse({"isAuthenticated": False})


@require_GET
@login_required
def my_pokemon_view(request):
    pokemons = Pokemon.objects.filter(user=request.user)
    return JsonResponse({
        "success": True,
        "pokemon": [{"id": p.id, "name": p.name} for p in pokemons]
    })

def user_username(_, username):
    user = get_object_or_404(User, username=username)

    # Get user profile for money information
    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        profile = Profile.objects.create(user=user)

    pokemon_queryset = Pokemon.objects.filter(user=user).prefetch_related(
        "money_trade_listing", "barter_trade_listing"
    )

    pokemon_data = []
    for pokemon in pokemon_queryset:
        p_dict = {
            "id": pokemon.id,
            "pokeapi_id": pokemon.pokeapi_id,
            "name": pokemon.name,
            "rarity": pokemon.rarity,
            "image_url": pokemon.image_url,
            "types": pokemon.types,
            "money_trade": None,
            "barter_trade": None,
        }

        try:
            trade = pokemon.money_trade_listing
            p_dict["money_trade"] = {
                "id": trade.id,
                "amount_asked": trade.amount_asked,
            }
        except MoneyTrade.DoesNotExist:
            pass

        try:
            trade = pokemon.barter_trade_listing
            p_dict["barter_trade"] = {
                "id": trade.id,
                "trade_preferences": trade.trade_preferences,
            }
        except BarterTrade.DoesNotExist:
            pass

        pokemon_data.append(p_dict)

    money_trades = list(
        MoneyTrade.objects.filter(pokemon__user=user).values(
            "id", "amount_asked", "pokemon__id", "pokemon__name"
        )
    )
    barter_trades = list(
        BarterTrade.objects.filter(pokemon__user=user).values(
            "id", "trade_preferences", "pokemon__id", "pokemon__name"
        )
    )

    return JsonResponse(
        {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "money": profile.money,
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

    # Create user profile with default money amount
    profile = Profile.objects.create(user=user)

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
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "money": profile.money,
            },
        },
        status=201,
    )


def pokemon_detail(request, pokemon_id):
    pokemon = get_object_or_404(Pokemon, id=pokemon_id)

    pokemon_data = {
        "id": pokemon.id,
        "pokeapi_id": pokemon.pokeapi_id,
        "name": pokemon.name,
        "rarity": pokemon.rarity,
        "image_url": pokemon.image_url,
        "types": pokemon.types,
        "owner": {
            "id": pokemon.user.id,
            "username": pokemon.user.username,
        },
        "is_owner": request.user.is_authenticated
        and request.user.id == pokemon.user.id,
        "money_trade": None,
        "barter_trade": None,
    }

    try:
        money_trade = pokemon.money_trade_listing
        pokemon_data["money_trade"] = {
            "id": money_trade.id,
            "amount_asked": money_trade.amount_asked,
        }
    except MoneyTrade.DoesNotExist:
        pass

    try:
        barter_trade = pokemon.barter_trade_listing
        pokemon_data["barter_trade"] = {
            "id": barter_trade.id,
            "trade_preferences": barter_trade.trade_preferences,
        }
    except BarterTrade.DoesNotExist:
        pass

    return JsonResponse({"success": True, "pokemon": pokemon_data, "is_owner": request.user.is_authenticated and request.user.id == pokemon.user.id })


@require_POST
def create_money_trade(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    data = json.loads(request.body)
    amount_asked = data.get("amount_asked")

    if not amount_asked or not isinstance(amount_asked, int) or amount_asked <= 0:
        return JsonResponse(
            {"success": False, "error": "Valid positive amount required"}, status=400
        )

    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing", "barter_trade_listing")
            .get(id=pokemon_id, user=request.user)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    if hasattr(pokemon, "money_trade_listing") or hasattr(
        pokemon, "barter_trade_listing"
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in a trade"},
            status=400,
        )

    trade = MoneyTrade.objects.create(
        pokemon=pokemon,
        amount_asked=amount_asked,
    )

    return JsonResponse(
        {
            "success": True,
            "trade": {
                "id": trade.id,
                "amount_asked": trade.amount_asked,
                "pokemon_id": pokemon.id,
            },
        },
        status=201,
    )


@require_POST
def create_barter_trade(request, pokemon_id):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"success": False, "error": "Authentication required"}, status=401
        )

    data = json.loads(request.body)
    trade_preferences = data.get("trade_preferences", "")

    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing", "barter_trade_listing")
            .get(id=pokemon_id, user=request.user)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    if hasattr(pokemon, "money_trade_listing") or hasattr(
        pokemon, "barter_trade_listing"
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in a trade"},
            status=400,
        )

    trade = BarterTrade.objects.create(
        pokemon=pokemon,
        trade_preferences=trade_preferences,
    )

    return JsonResponse(
        {
            "success": True,
            "trade": {
                "id": trade.id,
                "trade_preferences": trade.trade_preferences,
                "pokemon_id": pokemon.id,
            },
        },
        status=201,
    )


def is_admin(user):
    return user.is_staff

@user_passes_test(is_admin)
def admin_dashboard(request):
    """Get overview statistics for admin dashboard"""
    active_money_trades = MoneyTrade.objects.filter(status='active').count()
    active_barter_trades = BarterTrade.objects.filter(status='active').count()
    flagged_trades = MoneyTrade.objects.filter(is_flagged=True).count() + BarterTrade.objects.filter(is_flagged=True).count()
    pending_reports = TradeReport.objects.filter(status='pending').count()
    recent_trades = TradeHistory.objects.order_by('-timestamp')[:5]

    return JsonResponse({
        'active_trades': active_money_trades + active_barter_trades,
        'flagged_trades': flagged_trades,
        'pending_reports': pending_reports,
        'recent_trades': list(recent_trades.values('id', 'pokemon__name', 'buyer__username', 'seller__username', 'amount', 'timestamp'))
    })

@user_passes_test(is_admin)
def manage_trade(request, trade_type, trade_id):
    """Update trade status (flag/unflag/remove)"""
    try:
        model = MoneyTrade if trade_type == 'money' else BarterTrade
        trade = model.objects.get(id=trade_id)
        data = json.loads(request.body)
        action = data.get('action')
        
        if action == 'flag':
            trade.is_flagged = True
            trade.status = 'flagged'
            trade.flag_reason = data.get('reason')
        elif action == 'unflag':
            trade.is_flagged = False
            trade.status = 'active'
            trade.flag_reason = None
        elif action == 'remove':
            trade.status = 'removed'
        
        trade.admin_notes = data.get('admin_notes', trade.admin_notes)
        trade.save()
        return JsonResponse({'status': 'success'})
    except (MoneyTrade.DoesNotExist, BarterTrade.DoesNotExist):
        return JsonResponse({'error': 'Trade not found'}, status=404)

@user_passes_test(is_admin)
def manage_report(request, report_id):
    """Update report status and add admin notes"""
    try:
              buyer_profile = Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        buyer_profile = Profile.objects.create(user=request.user)

    try:
        seller_profile = Profile.objects.get(user=pokemon.user)
    except Profile.DoesNotExist:
        seller_profile = Profile.objects.create(user=pokemon.user)

    # Check if buyer has enough money
    if buyer_profile.money < money_trade.amount_asked:
        return JsonResponse(
            {
                "success": False,
                "error": "You don't have enough money for this purchase",
            },
            status=400,
        )

    # Process the transaction
    with transaction.atomic():
        # Transfer money
        buyer_profile.money -= money_trade.amount_asked
        seller_profile.money += money_trade.amount_asked
        buyer_profile.save()
        seller_profile.save()

        # Transfer ownership
        old_owner = pokemon.user
        pokemon.user = request.user
        pokemon.save()

        # Delete the trade
        money_trade.delete()

        TradeHistory.objects.create(
            buyer=request.user,
            seller=old_owner,
            pokemon=pokemon,
            amount=money_trade.amount_asked,
        )

        Notification.objects.create(
            user=old_owner,
            message=(
                f"Your Pokémon {pokemon.name} was sold to "
                f"{request.user.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )
        Notification.objects.create(
            user=request.user,
            message=(
                f"You bought {pokemon.name} from "
                f"{old_owner.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )

    return JsonResponse(
        {
            "success": True,
            "message": f"You successfully bought {pokemon.name} for ${money_trade.amount_asked}",
            "pokemon": {
                "id": pokemon.id,
                "name": pokemon.name,
                "previous_owner": old_owner.username,
            },
            "money_remaining": buyer_profile.money,
        }
    )
     
@user_passes_test(is_admin)
def list_reports(request):
    """Get paginated list of reports"""
    status = request.GET.get('status')
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    
    reports = TradeReport.objects.all().order_by('-created_at')
    if status:
        reports = reports.filter(status=status)
    
    start = (page - 1) * per_page
    end = start + per_page
    
    reports_page = reports[start:end]
    total_pages = (reports.count() + per_page - 1) // per_page
    
    return JsonResponse({
        'reports': [{
            'id': report.id,
            'trade_type': 'money' if report.money_trade else 'barter',
            'trade_id': report.money_trade.id if report.money_trade else report.barter_trade.id,
            'reporter': report.reporter.username,
            'reason': report.reason,
            'status': report.status,
            'created_at': report.created_at.isoformat(),
            'resolved_at': report.resolved_at.isoformat() if report.resolved_at else None,
            'admin_notes': report.admin_notes
        } for report in reports_page],
        'total_pages': total_pages,
        'current_page': page
    })

@user_passes_test(is_admin)
def trade_activity(request):
    """Get recent trade activity for monitoring"""
    days = int(request.GET.get('days', 7))
    since = timezone.now() - timezone.timedelta(days=days)
    
    trades = TradeHistory.objects.filter(
        timestamp__gte=since
    ).order_by('-timestamp')
    
    return JsonResponse({
        'trades': list(trades.values(
            'id', 'pokemon__name', 'buyer__username', 'seller__username',
            'amount', 'timestamp', 'is_flagged', 'admin_notes'
        ))
    })
 
@require_POST
@login_required
def send_trade_request(request):
    data = json.loads(request.body)
    receiver_id = data.get("receiver_id")
    sender_pokemon_id = data.get("sender_pokemon_id")
    receiver_pokemon_id = data.get("receiver_pokemon_id")

    if not (receiver_id and sender_pokemon_id and receiver_pokemon_id):
        return JsonResponse({"success": False, "error": "Missing fields"}, status=400)

    receiver = get_object_or_404(User, id=receiver_id)
    sender_pokemon = get_object_or_404(Pokemon, id=sender_pokemon_id, user=request.user)
    receiver_pokemon = get_object_or_404(Pokemon, id=receiver_pokemon_id, user=receiver)
    if request.user == receiver:
        return JsonResponse({"success": False, "error": "You cannot trade with yourself"}, status=400)

    trade = TradeRequest.objects.create(
        sender=request.user,
        receiver=receiver,
        sender_pokemon=sender_pokemon,
        receiver_pokemon=receiver_pokemon,
    )

    return JsonResponse({"success": True, "trade_id": trade.id}, status=201)

@require_POST
@login_required
def respond_trade_request(request, trade_id):
    data = json.loads(request.body)
    action = data.get("action")  # "accept" or "decline"

    if action not in ["accept", "decline"]:
        return JsonResponse({"success": False, "error": "Invalid action"}, status=400)

    trade = get_object_or_404(TradeRequest, id=trade_id, receiver=request.user)

    if trade.status != "pending":
        return JsonResponse({"success": False, "error": "Trade already resolved"}, status=400)

    trade.status = "accepted" if action == "accept" else "declined"
    trade.save()

    # If accepted, swap ownership
    if action == "accept":
        sender_pokemon = trade.sender_pokemon
        receiver_pokemon = trade.receiver_pokemon
        sender = trade.sender
        receiver = trade.receiver

        sender_pokemon.user = receiver
        receiver_pokemon.user = sender

        sender_pokemon.save()
        receiver_pokemon.save()

    return JsonResponse({"success": True, "new_status": trade.status})

@require_GET
@login_required
def incoming_trades_view(request):
    trades = TradeRequest.objects.filter(receiver=request.user, status="pending").select_related("sender", "sender_pokemon", "receiver_pokemon")

    trade_list = [
        {
            "id": t.id,
            "sender": {"id": t.sender.id, "username": t.sender.username},
            "receiver": {"id": t.receiver.id, "username": t.receiver.username},
            "sender_pokemon": {"id": t.sender_pokemon.id, "name": t.sender_pokemon.name},
            "receiver_pokemon": {"id": t.receiver_pokemon.id, "name": t.receiver_pokemon.name},
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in trades
    ]

    return JsonResponse({"success": True, "trades": trade_list})

@require_GET
@login_required
def incoming_trades_for_pokemon(request, pokemon_id):
    pokemon = get_object_or_404(Pokemon, id=pokemon_id, user=request.user)

    trades = TradeRequest.objects.filter(
        receiver=request.user,
        receiver_pokemon=pokemon,
        status="pending",
    ).select_related("sender", "sender_pokemon")

    trades_data = [
        {
            "id": trade.id,
            "sender_username": trade.sender.username,
            "sender_pokemon_name": trade.sender_pokemon.name,
        }
        for trade in trades
    ]

    return JsonResponse({"success": True, "trades": trades_data})

@require_GET
def user_profile(request, user_id):
    user = get_object_or_404(User, id=user_id)
    pokemons = Pokemon.objects.filter(user=user)

    return JsonResponse({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
        },
        "collection": [
            {
                "id": p.id,
                "name": p.name,
                "image_url": p.image_url,
                "rarity": p.rarity,
                "types": p.types,
            }
            for p in pokemons
        ]
    })

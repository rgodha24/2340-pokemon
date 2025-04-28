import json
import random

import requests
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .factories import (
    format_barter_trade_data,
    format_money_trade_data,
    format_notification_data,
    format_pokemon_data,
    format_trade_history_data,
    format_trade_request_data,
    format_user_data,
    notification_factory,
    pokemon_factory,
    trade_history_factory,
)

# Import models and factories
from .models import (
    BarterTrade,
    MoneyTrade,
    Notification,
    Pokemon,
    Profile,
    TradeHistory,
    TradeReport,
    TradeRequest,
)
from .pokeapi import random_pokemon


def index(_):
    data = {"message": "Hello World"}
    return JsonResponse(data)


@require_GET
def featured_pokemon(request):
    """
    Returns a list of random featured Pokémon from the database.
    Prioritizes Pokémon with higher rarity and those available for trade.
    """
    count = int(request.GET.get("count", 3))
    count = min(count, 10)

    # --- Querying logic remains the same ---
    trade_pokemon = (
        Pokemon.objects.filter(
            Q(money_trade_listing__isnull=False) | Q(barter_trade_listing__isnull=False)
        )
        .select_related("user")
        .prefetch_related("money_trade_listing", "barter_trade_listing")
        .order_by("-rarity")
    )

    if trade_pokemon.count() >= count:
        weighted_pokemon = []
        for pokemon in trade_pokemon:
            for _ in range(pokemon.rarity):
                weighted_pokemon.append(pokemon)

        if len(weighted_pokemon) > count:
            featured = weighted_pokemon[:count]
        else:
            featured = weighted_pokemon

        featured_unique = []
        seen_ids = set()
        for pokemon in featured:
            if pokemon.id not in seen_ids:
                featured_unique.append(pokemon)
                seen_ids.add(pokemon.id)
                if len(featured_unique) >= count:
                    break
        featured = featured_unique
    else:
        featured = list(trade_pokemon)
        remaining_count = count - len(featured)
        if remaining_count > 0:
            featured_ids = [p.id for p in featured]
            additional_pokemon = (
                Pokemon.objects.exclude(id__in=featured_ids)
                .select_related("user")
                .prefetch_related("money_trade_listing", "barter_trade_listing")
                .order_by("-rarity")[: remaining_count * 3]
            )

            weighted_additional = []
            for pokemon in additional_pokemon:
                for _ in range(pokemon.rarity):
                    weighted_additional.append(pokemon)

            if len(weighted_additional) > remaining_count:
                additional_featured = random.sample(
                    weighted_additional, remaining_count
                )
            else:
                additional_featured = weighted_additional

            additional_unique = []
            seen_ids = set()
            for pokemon in additional_featured:
                if pokemon.id not in seen_ids:
                    additional_unique.append(pokemon)
                    seen_ids.add(pokemon.id)
                    if len(additional_unique) >= remaining_count:
                        break
            featured.extend(additional_unique)
    # --- End of querying logic ---

    # Use the formatting helper
    featured_data = [format_pokemon_data(p, request.user) for p in featured]

    return JsonResponse({"success": True, "featured_pokemon": featured_data})


@require_POST
def login_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)
        # Use the formatting helper (which handles profile creation)
        user_data = format_user_data(user)
        return JsonResponse({"success": True, "user": user_data})
    else:
        return JsonResponse(
            {"success": False, "error": "Invalid credentials"}, status=400
        )


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


@require_GET
@login_required
def user_notifications(request):
    notifications = Notification.objects.filter(user=request.user).order_by(
        "-created_at"
    )
    # Use the formatting helper
    notifications_data = [format_notification_data(n) for n in notifications]
    return JsonResponse({"success": True, "notifications": notifications_data})


@require_POST
@login_required
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"success": True})


def filter_marketplace(request):
    query = request.GET.get("q", "").strip().lower()
    rarity = request.GET.get("rarity")
    ptype = request.GET.get("type")

    queryset = (
        Pokemon.objects.filter(
            Q(money_trade_listing__isnull=False) | Q(barter_trade_listing__isnull=False)
        )
        .select_related("user")
        .prefetch_related("money_trade_listing", "barter_trade_listing")
    )

    if query:
        queryset = queryset.filter(name__icontains=query)

    if rarity:
        try:
            queryset = queryset.filter(rarity=int(rarity))
        except ValueError:
            pass

    if ptype:
        queryset = queryset.filter(types__icontains=ptype.lower())

    results_data = [format_pokemon_data(p, request.user) for p in queryset]
    return JsonResponse({"success": True, "results": results_data})


def user_view(request):
    if request.user.is_authenticated:
        # Use the formatting helper (which handles profile creation)
        user_data = format_user_data(request.user)
        return JsonResponse({"isAuthenticated": True, "user": user_data})
    return JsonResponse({"isAuthenticated": False})


@require_GET
@login_required
def my_pokemon_view(request):
    pokemons = Pokemon.objects.filter(user=request.user)
    # Simple formatting is enough here
    return JsonResponse(
        {
            "success": True,
            "pokemon": [
                {"id": p.id, "name": p.name, "image_url": p.image_url} for p in pokemons
            ],
        }
    )


def user_username(_, username):
    user = get_object_or_404(User, username=username)
    profile = get_object_or_404(Profile, user=user)  # Assume profile exists now

    pokemon_queryset = Pokemon.objects.filter(user=user).prefetch_related(
        "money_trade_listing", "barter_trade_listing"
    )

    # Use formatting helpers
    user_data = format_user_data(user, profile)
    pokemon_data = [format_pokemon_data(p) for p in pokemon_queryset]

    # Formatting for open trades can stay simple or be moved to factory if needed
    money_trades = list(
        MoneyTrade.objects.filter(pokemon__user=user, status="active").values(
            "id", "amount_asked", "pokemon__id", "pokemon__name"
        )
    )
    barter_trades = list(
        BarterTrade.objects.filter(pokemon__user=user, status="active").values(
            "id", "trade_preferences", "pokemon__id", "pokemon__name"
        )
    )

    return JsonResponse(
        {
            "success": True,
            "user": user_data,
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
    profile = Profile.objects.create(user=user)
    user_pokemon_instances = []

    for _ in range(5):
        pokeapi_data = random_pokemon()
        # Use the Pokemon factory to create the instance
        pokemon_instance = pokemon_factory.create_pokemon_instance(user, pokeapi_data)
        user_pokemon_instances.append(pokemon_instance)

    Pokemon.objects.bulk_create(user_pokemon_instances)

    # Use the formatting helper
    user_data = format_user_data(user, profile)
    # Add email back if needed, format_user_data doesn't include it by default
    user_data["email"] = user.email

    return JsonResponse({"success": True, "user": user_data}, status=201)


@require_POST
@login_required
def cancel_trade(request, pokemon_id):
    try:
        pokemon = Pokemon.objects.prefetch_related(
            "money_trade_listing", "barter_trade_listing"
        ).get(id=pokemon_id, user=request.user)
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    deleted_trade = False
    try:
        trade = pokemon.money_trade_listing
        trade.delete()
        deleted_trade = True
    except (MoneyTrade.DoesNotExist, AttributeError):
        pass

    try:
        trade = pokemon.barter_trade_listing
        # Clear related offers if needed (model doesn't show this field anymore)
        # Pokemon.objects.filter(offered_in_trade=trade).update(offered_in_trade=None)
        trade.delete()
        deleted_trade = True
    except (BarterTrade.DoesNotExist, AttributeError):
        pass

    if deleted_trade:
        return JsonResponse(
            {"success": True, "message": "Trade listing deleted successfully."}
        )
    else:
        return JsonResponse(
            {
                "success": True,
                "message": "No active trade listing found for this Pokemon to cancel.",
            }
        )


@login_required
def trade_history_view(request):
    """Returns the trade history for the logged-in user, including money and barter trades."""
    history = (
        TradeHistory.objects.filter(Q(buyer=request.user) | Q(seller=request.user))
        .select_related("pokemon", "buyer", "seller")
        .order_by("-timestamp")
    )

    # Use the formatting helper
    results_data = [format_trade_history_data(h) for h in history]
    return JsonResponse({"success": True, "history": results_data})


@require_POST
@login_required
def buy_pokemon(request, pokemon_id):
    try:
        pokemon = (
            Pokemon.objects.select_related("user")
            .prefetch_related("money_trade_listing")
            .get(id=pokemon_id)
        )
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found"}, status=404
        )

    if pokemon.user == request.user:
        return JsonResponse(
            {"success": False, "error": "You cannot buy your own Pokemon"}, status=400
        )

    try:
        money_trade = pokemon.money_trade_listing
        if money_trade.status != "active":
            raise MoneyTrade.DoesNotExist  # Treat non-active as non-existent for buying
    except (MoneyTrade.DoesNotExist, AttributeError):
        return JsonResponse(
            {"success": False, "error": "This Pokemon is not for sale"}, status=400
        )

    buyer_profile = get_object_or_404(Profile, user=request.user)
    seller_profile = get_object_or_404(Profile, user=pokemon.user)

    if buyer_profile.money < money_trade.amount_asked:
        return JsonResponse(
            {
                "success": False,
                "error": "You don't have enough money for this purchase",
            },
            status=400,
        )

    with transaction.atomic():
        buyer_profile.money -= money_trade.amount_asked
        seller_profile.money += money_trade.amount_asked
        buyer_profile.save()
        seller_profile.save()

        old_owner = pokemon.user
        pokemon.user = request.user
        pokemon.save()

        # Mark the trade as completed instead of deleting it
        money_trade_id = money_trade.id
        money_trade.status = "completed"
        money_trade.save()

        TradeHistory.objects.create(
            buyer=request.user,
            seller=old_owner,
            pokemon=pokemon,
            amount=money_trade.amount_asked,
            trade_type="money",
            trade_ref_id=money_trade_id,
        )

        # Mark trade as completed instead of deleting? Or delete is fine.
        money_trade.delete()  # Or money_trade.status = 'completed'; money_trade.save()

        # Use the Notification factory
        notification_to_seller = notification_factory.create_notification(
            user=old_owner,
            message=(
                f"Your Pokémon {pokemon.name} was sold to "
                f"{request.user.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )
        notification_to_buyer = notification_factory.create_notification(
            user=request.user,
            message=(
                f"You bought {pokemon.name} from "
                f"{old_owner.username} for ${money_trade.amount_asked}."
            ),
            link=f"/pokemon/{pokemon.id}",
        )
        Notification.objects.bulk_create(
            [notification_to_seller, notification_to_buyer]
        )

    return JsonResponse(
        {
            "success": True,
            "message": f"You successfully bought {pokemon.name} for ${money_trade.amount_asked}",
            "pokemon": {  # Simple dict is fine here
                "id": pokemon.id,
                "name": pokemon.name,
                "previous_owner": old_owner.username,
            },
            "money_remaining": buyer_profile.money,
        }
    )


def pokemon_detail(request, pokemon_id):
    pokemon = get_object_or_404(
        Pokemon.objects.select_related("user").prefetch_related(
            "money_trade_listing", "barter_trade_listing"
        ),
        id=pokemon_id,
    )

    # Use the formatting helper
    pokemon_data = format_pokemon_data(pokemon, request.user)

    return JsonResponse(
        {
            "success": True,
            "pokemon": pokemon_data,
            # is_owner is now included in format_pokemon_data if request.user is passed
        }
    )


@require_POST
@login_required
def create_money_trade(request, pokemon_id):
    data = json.loads(request.body)
    amount_asked = data.get("amount_asked")

    if not amount_asked or not isinstance(amount_asked, int) or amount_asked <= 0:
        return JsonResponse(
            {"success": False, "error": "Valid positive amount required"}, status=400
        )

    try:
        pokemon = Pokemon.objects.get(id=pokemon_id, user=request.user)
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    # Check if already listed (using exists for efficiency)
    if (
        MoneyTrade.objects.filter(pokemon=pokemon, status="active").exists()
        or BarterTrade.objects.filter(pokemon=pokemon, status="active").exists()
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in an active trade"},
            status=400,
        )

    # Direct creation is simple enough here, no complex logic needed yet
    trade = MoneyTrade.objects.create(
        pokemon=pokemon,
        amount_asked=amount_asked,
        status="active",  # Explicitly set status
    )

    return JsonResponse(
        {
            "success": True,
            # Use formatting helper for consistency
            "trade": format_money_trade_data(trade) | {"pokemon_id": pokemon.id},
        },
        status=201,
    )


@require_POST
@login_required
def create_barter_trade(request, pokemon_id):
    data = json.loads(request.body)
    trade_preferences = data.get("trade_preferences", "")

    try:
        pokemon = Pokemon.objects.get(id=pokemon_id, user=request.user)
    except Pokemon.DoesNotExist:
        return JsonResponse(
            {"success": False, "error": "Pokemon not found or not owned by user"},
            status=404,
        )

    # Check if already listed
    if (
        MoneyTrade.objects.filter(pokemon=pokemon, status="active").exists()
        or BarterTrade.objects.filter(pokemon=pokemon, status="active").exists()
    ):
        return JsonResponse(
            {"success": False, "error": "Pokemon is already listed in an active trade"},
            status=400,
        )

    # Direct creation is simple
    trade = BarterTrade.objects.create(
        pokemon=pokemon,
        trade_preferences=trade_preferences,
        status="active",
    )

    return JsonResponse(
        {
            "success": True,
            # Use formatting helper
            "trade": format_barter_trade_data(trade) | {"pokemon_id": pokemon.id},
        },
        status=201,
    )


# --- Admin Views ---
# These views are less repetitive and don't benefit as much from factories
# for their core logic, but could use formatting helpers if returning complex data.


def is_admin(user):
    return user.is_staff


@user_passes_test(is_admin)
def admin_dashboard(request):
    """Get overview statistics for admin dashboard"""
    active_money_trades = MoneyTrade.objects.filter(status="active").count()
    active_barter_trades = BarterTrade.objects.filter(status="active").count()
    flagged_trades = TradeReport.objects.filter(
        status__in=["pending", "investigating"]
    ).count()  # Count pending/investigating reports as "flagged" for admin attention
    pending_reports = TradeReport.objects.filter(status="pending").count()
    recent_trades = TradeHistory.objects.order_by("-timestamp")[:5]

    # Simple formatting is okay here
    recent_trades_data = [
        {
            "id": t.id,
            "pokemon_name": t.pokemon.name if t.pokemon else "N/A",
            "buyer": t.buyer.username,
            "seller": t.seller.username,
            "amount": t.amount,
            "timestamp": t.timestamp.isoformat(),
            "trade_type": "money" if t.amount > 0 else "barter",
        }
        for t in recent_trades
    ]

    return JsonResponse(
        {
            "active_trades": active_money_trades + active_barter_trades,
            "flagged_trades": flagged_trades,
            "pending_reports": pending_reports,
            "recent_trades": recent_trades_data,
        }
    )


@user_passes_test(is_admin)
@require_POST
def manage_trade(request, trade_type, trade_id):
    """Update trade status (flag/unflag/remove) - Logic remains"""
    try:
        model = MoneyTrade if trade_type == "money" else BarterTrade
        trade = model.objects.get(id=trade_id)
        data = json.loads(request.body)
        action = data.get("action")

        if action == "flag":
            trade.is_flagged = True
            # Optionally change status, or just use is_flagged
            # trade.status = 'flagged'
            trade.flag_reason = data.get("reason")
        elif action == "unflag":
            trade.is_flagged = False
            # trade.status = 'active' # Revert status if needed
            trade.flag_reason = None
        elif action == "remove":
            trade.status = "removed"
            # Consider setting is_flagged = False if removing
            trade.is_flagged = False

        trade.admin_notes = data.get("admin_notes", trade.admin_notes)
        trade.save()
        return JsonResponse({"status": "success"})
    except (MoneyTrade.DoesNotExist, BarterTrade.DoesNotExist):
        return JsonResponse({"error": "Trade not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@user_passes_test(is_admin)
@require_POST
def manage_report(request, report_id):
    """Update report status and add admin notes - Logic remains"""
    try:
        report = TradeReport.objects.get(id=report_id)
        data = json.loads(request.body)
        status = data.get("status")
        admin_notes = data.get("admin_notes")

        if status not in [s[0] for s in TradeReport.REPORT_STATUS]:
            return JsonResponse({"error": "Invalid status"}, status=400)

        report.status = status
        report.admin_notes = admin_notes
        if status in ["resolved", "dismissed"]:
            report.resolved_at = timezone.now()
            report.resolved_by = request.user
        else:
            # Clear resolution fields if moving back to pending/investigating
            report.resolved_at = None
            report.resolved_by = None

        report.save()
        return JsonResponse({"status": "success"})
    except TradeReport.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@user_passes_test(is_admin)
def list_reports(request):
    """Get paginated list of reports - Using simpler formatting"""
    status = request.GET.get("status")
    page = int(request.GET.get("page", 1))
    per_page = int(request.GET.get("per_page", 20))

    reports = (
        TradeReport.objects.select_related(
            "reporter", "resolved_by", "money_trade__pokemon", "barter_trade__pokemon"
        )
        .all()
        .order_by("-created_at")
    )
    if status:
        reports = reports.filter(status=status)

    start = (page - 1) * per_page
    end = start + per_page

    reports_page = reports[start:end]
    total_count = reports.count()
    total_pages = (total_count + per_page - 1) // per_page

    # Simplified formatting within the view
    reports_data = []
    for report in reports_page:
        trade = report.money_trade or report.barter_trade
        trade_type = "money" if report.money_trade else "barter"
        reports_data.append(
            {
                "id": report.id,
                "trade_type": trade_type,
                "trade_id": trade.id if trade else None,
                "pokemon_name": trade.pokemon.name if trade else "N/A",
                "reporter": report.reporter.username,
                "reason": report.reason,
                "status": report.status,
                "created_at": report.created_at.isoformat(),
                "resolved_at": report.resolved_at.isoformat()
                if report.resolved_at
                else None,
                "resolved_by": report.resolved_by.username
                if report.resolved_by
                else None,
                "admin_notes": report.admin_notes,
            }
        )

    return JsonResponse(
        {
            "reports": reports_data,
            "total_pages": total_pages,
            "current_page": page,
            "total_count": total_count,
        }
    )


@user_passes_test(is_admin)
def trade_activity(request):
    """Get recent trade activity for monitoring - Using formatting helper"""
    days = int(request.GET.get("days", 7))
    since = timezone.now() - timezone.timedelta(days=days)

    trades = (
        TradeHistory.objects.filter(timestamp__gte=since)
        .select_related("pokemon", "buyer", "seller")
        .order_by("-timestamp")
    )

    # Use the formatting helper
    trades_data = [format_trade_history_data(t) for t in trades]

    return JsonResponse({"trades": trades_data})


# --- Trade Request Views ---


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
        return JsonResponse(
            {"success": False, "error": "You cannot trade with yourself"}, status=400
        )

    # Check if either Pokemon is already in an active trade request
    # Simplified check:
    if TradeRequest.objects.filter(
        Q(sender_pokemon=sender_pokemon) | Q(receiver_pokemon=sender_pokemon),
        status="pending",
    ).exists():
        return JsonResponse(
            {
                "success": False,
                "error": f"{sender_pokemon.name} is already involved in a pending trade.",
            },
            status=400,
        )
    if TradeRequest.objects.filter(
        Q(sender_pokemon=receiver_pokemon) | Q(receiver_pokemon=receiver_pokemon),
        status="pending",
    ).exists():
        return JsonResponse(
            {
                "success": False,
                "error": f"{receiver_pokemon.name} is already involved in a pending trade.",
            },
            status=400,
        )

    # Direct creation is simple
    trade = TradeRequest.objects.create(
        sender=request.user,
        receiver=receiver,
        sender_pokemon=sender_pokemon,
        receiver_pokemon=receiver_pokemon,
        status="pending",  # Explicitly set
    )

    # Use Notification factory
    notification = notification_factory.create_notification(
        user=receiver,
        message=(
            f"{request.user.username} wants to trade their {sender_pokemon.name} "
            f"for your {receiver_pokemon.name}!"
        ),
        link="/incoming-trades/",
    )
    notification.save()

    return JsonResponse({"success": True, "trade_id": trade.id}, status=201)


@require_POST
@login_required
def respond_trade_request(request, trade_id):
    data = json.loads(request.body)
    action = data.get("action")  # "accept" or "decline"

    if action not in ["accept", "decline"]:
        return JsonResponse({"success": False, "error": "Invalid action"}, status=400)

    # Ensure the trade exists and belongs to the user as receiver
    trade = get_object_or_404(
        TradeRequest.objects.select_related(
            "sender", "receiver", "sender_pokemon", "receiver_pokemon"
        ),
        id=trade_id,
        receiver=request.user,
    )

    if trade.status != "pending":
        return JsonResponse(
            {"success": False, "error": "Trade already resolved"}, status=400
        )

    with transaction.atomic():
        new_status = "accepted" if action == "accept" else "declined"
        trade.status = new_status
        trade.save()

        sender_pokemon = trade.sender_pokemon
        receiver_pokemon = trade.receiver_pokemon
        sender = trade.sender
        receiver = trade.receiver  # == request.user

        notifications_to_create = []

        if action == "accept":
            # Cancel any active *barter* listings for these specific Pokemon
            # Money listings might remain, depending on desired logic
            BarterTrade.objects.filter(
                pokemon__in=[sender_pokemon, receiver_pokemon], status="active"
            ).delete()

            # Swap ownership
            sender_pokemon.user = receiver
            receiver_pokemon.user = sender
            sender_pokemon.save()
            receiver_pokemon.save()

            # Decline other *pending* trades involving these specific Pokemon
            # Important: Exclude the current trade being accepted
            conflicting_trades = TradeRequest.objects.filter(
                Q(sender_pokemon=sender_pokemon)
                | Q(receiver_pokemon=sender_pokemon)
                | Q(sender_pokemon=receiver_pokemon)
                | Q(receiver_pokemon=receiver_pokemon),
                status="pending",
            ).exclude(id=trade.id)

            # Notify users whose trades were auto-declined
            for conflicting_trade in conflicting_trades:
                other_user = (
                    conflicting_trade.receiver
                    if conflicting_trade.sender == sender
                    or conflicting_trade.sender == receiver
                    else conflicting_trade.sender
                )
                involved_pokemon = (
                    sender_pokemon.name
                    if conflicting_trade.sender_pokemon == sender_pokemon
                    or conflicting_trade.receiver_pokemon == sender_pokemon
                    else receiver_pokemon.name
                )
                notifications_to_create.append(
                    notification_factory.create_notification(
                        user=other_user,
                        message=(
                            f"Your trade involving {involved_pokemon} was automatically "
                            f"declined because the Pokémon was traded elsewhere."
                        ),
                    )
                )
            conflicting_trades.update(status="declined")

            # Use TradeHistory factory for barter
            history_entries = trade_history_factory.create_barter_trade_history(
                sender, receiver, sender_pokemon, receiver_pokemon
            )
            TradeHistory.objects.bulk_create(history_entries)

            # Create notifications for acceptance
            notifications_to_create.append(
                notification_factory.create_notification(
                    user=sender,
                    message=(
                        f"{receiver.username} accepted your trade offer! "
                        f"You received {receiver_pokemon.name}."
                    ),
                    link=f"/pokemon/{receiver_pokemon.id}",
                )
            )
            notifications_to_create.append(
                notification_factory.create_notification(
                    user=receiver,
                    message=(
                        f"You accepted the trade offer from {sender.username}. "
                        f"You received {sender_pokemon.name}."
                    ),
                    link=f"/pokemon/{sender_pokemon.id}",
                )
            )

        else:  # Declined
            # Create notification for decline
            notifications_to_create.append(
                notification_factory.create_notification(
                    user=sender,
                    message=(
                        f"{receiver.username} declined your trade offer for "
                        f"{receiver_pokemon.name}."
                    ),
                    # No link needed for decline usually
                )
            )

        # Bulk create all notifications generated in this transaction
        if notifications_to_create:
            Notification.objects.bulk_create(notifications_to_create)

    return JsonResponse({"success": True, "new_status": new_status})


@require_GET
@login_required
def incoming_trades_view(request):
    trades = TradeRequest.objects.filter(
        receiver=request.user, status="pending"
    ).select_related(
        "sender", "sender_pokemon", "receiver", "receiver_pokemon"
    )  # Added receiver

    # Use the formatting helper
    trade_list_data = [format_trade_request_data(t) for t in trades]

    return JsonResponse({"success": True, "trades": trade_list_data})


@require_GET
@login_required
def incoming_trades_for_pokemon(request, pokemon_id):
    # Ensure the pokemon belongs to the logged-in user
    pokemon = get_object_or_404(Pokemon, id=pokemon_id, user=request.user)

    trades = TradeRequest.objects.filter(
        receiver=request.user,  # Redundant check, but safe
        receiver_pokemon=pokemon,
        status="pending",
    ).select_related("sender", "sender_pokemon")

    # Simpler formatting is sufficient here, or use format_trade_request_data
    trades_data = [
        {
            "id": trade.id,
            "sender_username": trade.sender.username,
            "sender_pokemon_id": trade.sender_pokemon.id,
            "sender_pokemon_name": trade.sender_pokemon.name,
            "sender_pokemon_image_url": trade.sender_pokemon.image_url,
            "created_at": trade.created_at.isoformat(),  # Added timestamp
        }
        for trade in trades
    ]
    # Alternative using the main formatter:
    # trades_data = [format_trade_request_data(trade) for trade in trades]

    return JsonResponse({"success": True, "trades": trades_data})


@require_GET
def user_profile(request, user_id):
    # Renamed from user_profile to avoid conflict with username view if routes overlap
    target_user = get_object_or_404(User, id=user_id)
    profile = get_object_or_404(Profile, user=target_user)
    pokemons = Pokemon.objects.filter(user=target_user)

    # Use formatting helpers
    user_data = format_user_data(target_user, profile)
    # Use the basic pokemon formatter (no trade info needed for public profile view)
    collection_data = [
        {
            "id": p.id,
            "name": p.name,
            "image_url": p.image_url,
            "rarity": p.rarity,
            "types": p.types,
        }
        for p in pokemons
    ]

    return JsonResponse(
        {
            "success": True,
            "user": user_data,
            "collection": collection_data,
        }
    )


HUGGINGFACE_API_URL = (
    "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta"
)
HUGGINGFACE_TOKEN = "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"


@csrf_exempt  # Keep csrf_exempt if using cookie auth and calling from external frontend
@require_POST
def password_reset(request):
    """
    Handle password reset requests using Django's built-in password reset functionality.
    """
    try:
        data = json.loads(request.body)
        email = data.get("email", "")

        if not email:
            return JsonResponse(
                {"success": False, "error": "Email is required"}, status=400
            )

        from django.conf import settings
        from django.contrib.auth.forms import PasswordResetForm

        form = PasswordResetForm({"email": email})

        if form.is_valid():
            # Ensure domain_override matches your frontend URL for the reset link
            # Use settings for domain if possible
            domain_override = (
                getattr(settings, "FRONTEND_URL", "localhost:5173")
                .replace("http://", "")
                .replace("https://", "")
            )

            form.save(
                request=request,
                use_https=request.is_secure(),
                from_email=settings.DEFAULT_FROM_EMAIL,
                email_template_name="registration/password_reset_email.html",
                subject_template_name="registration/password_reset_subject.txt",
                domain_override=domain_override,  # Use the frontend domain
            )
            # Always return success to prevent email enumeration
            return JsonResponse(
                {
                    "success": True,
                    "message": "If an account with that email exists, a password reset link has been sent.",
                }
            )
        else:
            # Even if form is invalid (e.g., email doesn't exist), return success message
            return JsonResponse(
                {
                    "success": True,
                    "message": "If an account with that email exists, a password reset link has been sent.",
                }
            )

    except Exception as e:
        print(f"Exception in password_reset: {e}")  # Log the error server-side
        # Return a generic error to the client
        return JsonResponse(
            {"success": False, "error": "An error occurred during password reset."},
            status=500,
        )


@csrf_exempt
@require_POST
def chatbot_chat(request):
    try:
        data = json.loads(request.body)
        prompt = data.get("prompt", "")

        if not prompt:
            return JsonResponse(
                {"success": False, "error": "No prompt provided"}, status=400
            )

        headers = {
            "Authorization": f"Bearer {HUGGINGFACE_TOKEN}",  # Use token from secure source
            "Content-Type": "application/json",
        }
        payload = {
            "inputs": prompt,
            "parameters": {
                "temperature": 0.7,
                "max_new_tokens": 150,
            },  # Adjusted params slightly
        }

        response = requests.post(
            HUGGINGFACE_API_URL, headers=headers, json=payload, timeout=30
        )  # Added timeout
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        hf_response = response.json()
        model_output = ""

        # Handle potential variations in HF response structure
        if isinstance(hf_response, list) and hf_response:
            generated_text = hf_response[0].get("generated_text", "")
            # Often the model includes the prompt, remove it if present
            if generated_text.startswith(prompt):
                model_output = generated_text[len(prompt) :].strip()
            else:
                model_output = generated_text.strip()
        elif isinstance(hf_response, dict) and "generated_text" in hf_response:
            generated_text = hf_response.get("generated_text", "")
            if generated_text.startswith(prompt):
                model_output = generated_text[len(prompt) :].strip()
            else:
                model_output = generated_text.strip()
        else:
            print(f"Unexpected HuggingFace response format: {hf_response}")
            model_output = "Sorry, I couldn't process that response."

        return JsonResponse({"success": True, "reply": model_output})

    except requests.exceptions.RequestException as e:
        print(f"HuggingFace API request error: {e}")
        return JsonResponse(
            {"success": False, "error": "Failed to reach chatbot service."}, status=503
        )
    except Exception as e:
        print(f"Exception in chatbot_chat: {e}")
        return JsonResponse(
            {"success": False, "error": "An internal error occurred."}, status=500
        )


@require_POST
@login_required
def submit_trade_report(request, trade_id):
    """Submit a report for a trade"""
    try:
        data = json.loads(request.body)
        reason = data.get("reason")

        if not reason:
            return JsonResponse(
                {"success": False, "error": "Reason is required"}, status=400
            )

        # Try to find the trade (either money or barter)
        try:
            trade = MoneyTrade.objects.get(id=trade_id)
            trade_type = "money"
        except MoneyTrade.DoesNotExist:
            try:
                trade = BarterTrade.objects.get(id=trade_id)
                trade_type = "barter"
            except BarterTrade.DoesNotExist:
                return JsonResponse(
                    {"success": False, "error": "Trade not found"}, status=404
                )

        # Create the report
        report = TradeReport.objects.create(
            reporter=request.user,
            reason=reason,
            **{f"{trade_type}_trade": trade},  # Set either money_trade or barter_trade
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Report submitted successfully",
                "report_id": report.id,
            }
        )
    except json.JSONDecodeError:
        return JsonResponse(
            {"success": False, "error": "Invalid JSON data"}, status=400
        )


@require_GET
def trade_detail_view(request, trade_id):
    """Return details for a trade (money or barter) by its ID"""
    # Try to find a MoneyTrade first
    try:
        trade = MoneyTrade.objects.select_related("pokemon", "pokemon__user").get(
            id=trade_id
        )
        trade_type = "money"
    except MoneyTrade.DoesNotExist:
        try:
            trade = BarterTrade.objects.select_related("pokemon", "pokemon__user").get(
                id=trade_id
            )
            trade_type = "barter"
        except BarterTrade.DoesNotExist:
            return JsonResponse(
                {"success": False, "error": "Trade not found"}, status=404
            )

    pokemon = trade.pokemon
    owner = pokemon.user
    trade_data = {
        "id": trade.id,
        "type": trade_type,
        "pokemon": {
            "id": pokemon.id,
            "name": pokemon.name,
            "image_url": pokemon.image_url,
            "rarity": pokemon.rarity,
            "types": pokemon.types,
        },
        "owner": {
            "id": owner.id,
            "username": owner.username,
        },
        "created_at": trade.created_at.isoformat()
        if hasattr(trade, "created_at")
        else None,
        "is_flagged": getattr(trade, "is_flagged", False),
        "admin_notes": getattr(trade, "admin_notes", None),
    }
    if trade_type == "money":
        trade_data["amount_asked"] = trade.amount_asked
    else:
        trade_data["trade_preferences"] = trade.trade_preferences

    return JsonResponse({"success": True, "trade": trade_data})

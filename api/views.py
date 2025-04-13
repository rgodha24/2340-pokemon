import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.http import require_POST


def index(request):
    data = {"message": "Hello World"}
    return JsonResponse(data, safe=False)


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


@require_POST
def signup_view(request):
    data = json.loads(request.body)
    username = data.get("username", "")
    password = data.get("password", "")
    email = data.get("email", "")

    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "error": "Username already exists"}, status=400
        )

    # Create the user
    user = User.objects.create_user(username=username, email=email, password=password)

    return JsonResponse(
        {
            "success": True,
            "user": {"id": user.id, "username": user.username, "email": user.email},
        },
        status=201,
    )

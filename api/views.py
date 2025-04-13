from django.http import JsonResponse


# Create your views here.
def index(request):
    data = {"message": "Hello World"}
    return JsonResponse(data, safe=False)

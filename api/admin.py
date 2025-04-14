from django.contrib import admin
from .models import Profile, Pokemon, MoneyTrade, BarterTrade

# Register your models here.
admin.site.register(Profile)
admin.site.register(Pokemon)
admin.site.register(MoneyTrade)
admin.site.register(BarterTrade)

from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("signup/", views.signup_view, name="signup"),
    path("user/", views.user_view, name="user"),
    
    # Admin endpoints
    path("admin/dashboard/", views.admin_dashboard, name="admin_dashboard"),
    path("admin/trade/<str:trade_type>/<int:trade_id>/", views.manage_trade, name="manage_trade"),
    path("admin/report/<int:report_id>/", views.manage_report, name="manage_report"),
    path("admin/reports/", views.list_reports, name="list_reports"),
    path("admin/activity/", views.trade_activity, name="trade_activity"),
]

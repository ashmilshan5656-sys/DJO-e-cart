from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from cart.models import CartItem
from .models import Order, OrderItem

@api_view(['POST'])
def checkout(request):

    cart_id = request.data.get('cart_id')
    name = request.data.get('customer_name')
    email = request.data.get('email')
    address = request.data.get('address')

    if not all([cart_id, name, email, address]):
        return Response({'error': 'All fields are required'}, status=400)

    items = CartItem.objects.filter(cart_id=cart_id).select_related('product')

    if not items.exists():
        return Response({'error': 'Cart is empty'}, status=400)

    with transaction.atomic():

        total = sum(item.product.price * item.quantity for item in items)

        order = Order.objects.create(
            customer_name=name,
            email=email,
            address=address,
            total_amount=total
        )

        for item in items:
            if item.quantity > item.product.stock:
                return Response(
                    {'error': f'Insufficient stock for {item.product.name}'},
                    status=400
                )

            OrderItem.objects.create(
                order=order,
                product_name=item.product.name,
                price=item.product.price,
                quantity=item.quantity
            )

            item.product.stock -= item.quantity
            item.product.save()

        items.delete()

    return Response({
        'message': 'Order placed successfully!',
        'order_id': order.id,
        'total': total
    }, status=201)
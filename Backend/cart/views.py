from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CartItem
from .serializers import CartSerializer

@api_view(['GET', 'POST', 'DELETE'])
def cart_list(request):

    cart_id = request.query_params.get('cart_id') or request.data.get('cart_id')

    if not cart_id:
        return Response({'error': 'Cart ID required'}, status=400)

    if request.method == 'GET':
        items = CartItem.objects.filter(cart_id=cart_id)
        serializer = CartSerializer(items, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        product_id = request.data.get('product_id')

        item, created = CartItem.objects.get_or_create(
            cart_id=cart_id,
            product_id=product_id,
            defaults={'quantity': 1}
        )

        if not created:
            item.quantity += 1
            item.save()

        return Response({'message': 'Product added to cart'})

    elif request.method == 'DELETE':
        item_id = request.data.get('item_id')

        CartItem.objects.filter(
            id=item_id,
            cart_id=cart_id
        ).delete()

        return Response({'message': 'Product removed'})
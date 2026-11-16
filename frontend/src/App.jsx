/* eslint-disable react-hooks/static-components */
import { useEffect, useMemo, useState } from 'react'
import API from './api'
import iphoneProductImage from './assets/iphone-18-pro.jpeg'
import jblProductImage from './assets/jbl-partybox-710.jpeg'
import lenovoProductImage from './assets/lenovo-loq.jpeg'
import samsungProductImage from './assets/samsung-s25-ultra.jpeg'
import vivoProductImage from './assets/vivo-x-fold-6-5g.jpeg'
import './App.css'

const money = (value) => `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const localProductImages = {
    'vivo x fold 6 5g': vivoProductImage,
    'iphone 18 pro': iphoneProductImage,
    'samsung s25 ultra': samsungProductImage,
    'lenovo loq laptop': lenovoProductImage,
    'jbl speaker': jblProductImage,
}
const productImageUrl = (image, name) => {
    const localImage = localProductImages[name?.trim().toLowerCase()]
    if (localImage) return localImage
    if (!image) return ''
    const baseURL = API.defaults.baseURL.startsWith('http') ? API.defaults.baseURL : window.location.origin
    return new URL(image, baseURL).href
}

function App() {
    const [user, setUser] = useState(localStorage.getItem('username') || '')
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [authMode, setAuthMode] = useState(null)
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [showCart, setShowCart] = useState(false)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [checkout, setCheckout] = useState({ name: '', email: '', address: '' })
    const cartId = user ? `cart_${user}` : ''
    const notify = (text) => { setMessage(text); window.setTimeout(() => setMessage(''), 3500) }

    const loadProducts = async () => {
        setLoading(true); setError('')
        try {
            const { data } = await API.get('products/')
            const items = Array.isArray(data) ? data : data.results || []
            setProducts(items.map((product) => ({ ...product, image: productImageUrl(product.image, product.name) })))
        } catch { setError('Could not load products. Start the Django server, then refresh.') }
        finally { setLoading(false) }
    }
    const loadCart = async () => {
        if (!cartId) return
        const { data } = await API.get(`cart/?cart_id=${encodeURIComponent(cartId)}`)
        setCart(Array.isArray(data) ? data : data.results || [])
    }
    useEffect(() => { queueMicrotask(loadProducts) }, [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (user) queueMicrotask(loadCart) }, [user])

    const categories = useMemo(() => ['All', ...new Set(products.map((item) => item.category).filter(Boolean))], [products])
    const visibleProducts = products.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All' || item.category === category))
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

    const openAuth = (mode) => { setError(''); setPassword(''); setAuthMode(mode) }
    const submitAuth = async (event) => {
        event.preventDefault(); setError('')
        try {
            if (authMode === 'register') {
                await API.post('accounts/register/', { username, email, password })
                notify('Account created. Please log in.'); setAuthMode('login'); return
            }
            const { data } = await API.post('accounts/login/', { username, password })
            localStorage.setItem('access', data.access); localStorage.setItem('refresh', data.refresh); localStorage.setItem('username', username)
            API.defaults.headers.common.Authorization = `Bearer ${data.access}`
            setUser(username); setAuthMode(null); notify(`Welcome, ${username}!`)
        } catch (requestError) { setError(requestError.response?.data?.detail || 'Please check your details and try again.') }
    }
    const addToCart = async (product) => {
        if (!user) { openAuth('login'); notify('Please log in to add items to your cart.'); return }
        await API.post('cart/', { cart_id: cartId, product_id: product.id }); await loadCart(); notify(`${product.name} added to cart.`)
    }
    const removeCartItem = async (id) => { await API.delete('cart/', { data: { cart_id: cartId, item_id: id } }); await loadCart() }
    const logout = () => { ['access', 'refresh', 'username'].forEach((key) => localStorage.removeItem(key)); delete API.defaults.headers.common.Authorization; setUser(''); setCart([]); setShowCart(false) }
    const submitCheckout = async (event) => {
        event.preventDefault(); setError('')
        try {
            const { data } = await API.post('orders/checkout/', { cart_id: cartId, customer_name: checkout.name, email: checkout.email, address: checkout.address })
            await Promise.all([loadCart(), loadProducts()]); setCheckoutOpen(false); setShowCart(false); notify(`Order #${data.order_id} placed successfully!`)
        } catch (requestError) { setError(requestError.response?.data?.error || 'Checkout failed.') }
    }

    const ProductGrid = () => <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}>
        <div className={`product-art ${product.category === 'Laptop' ? 'landscape-product' : 'portrait-product'}`}>{product.image ? <img src={product.image} alt={product.name} /> : <span>{product.category?.slice(0, 1) || 'P'}</span>}</div>
        <div className="product-details"><p className="category-label">{product.category}</p><h2>{product.name}</h2><p className="description">{product.description}</p><div className="product-bottom"><div><strong>{money(product.price)}</strong><small>{product.stock} in stock</small></div><button className="add-button" disabled={product.stock <= 0} onClick={() => addToCart(product)}>{product.stock > 0 ? 'Add to cart' : 'Sold out'}</button></div></div>
    </article>)}</div>

    return <div className="shop-shell">
        <header className="shop-nav"><button className="brand" onClick={() => setShowCart(false)}>ECART<span>.</span></button><div className="nav-actions">{user ? <><span className="welcome">Hi, {user}</span><button className="cart-button" onClick={() => setShowCart(!showCart)}>Cart <b>{itemCount}</b></button><button className="button button-outline" onClick={logout}>Log out</button></> : <><button className="button button-text" onClick={() => openAuth('login')}>Log in</button><button className="button button-dark" onClick={() => openAuth('register')}>Create account</button></>}</div></header>
        {message && <div className="toast-message">{message}</div>}
        {authMode && <div className="modal-backdrop"><section className="auth-modal"><button className="close-button" onClick={() => setAuthMode(null)}>×</button><p className="eyebrow">ECART ACCOUNT</p><h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1><form onSubmit={submitAuth} className="form-stack"><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label>{authMode === 'register' && <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}<label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark button-full">{authMode === 'login' ? 'Log in' : 'Create account'}</button></form><button className="switch-auth" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}</button></section></div>}
        {checkoutOpen && <div className="modal-backdrop"><section className="auth-modal"><button className="close-button" onClick={() => setCheckoutOpen(false)}>×</button><p className="eyebrow">CHECKOUT</p><h1>Delivery details</h1><form onSubmit={submitCheckout} className="form-stack"><label>Full name<input value={checkout.name} onChange={(event) => setCheckout({ ...checkout, name: event.target.value })} required /></label><label>Email<input type="email" value={checkout.email} onChange={(event) => setCheckout({ ...checkout, email: event.target.value })} required /></label><label>Address<textarea value={checkout.address} onChange={(event) => setCheckout({ ...checkout, address: event.target.value })} required /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark button-full">Place order · {money(total)}</button></form></section></div>}
        <main>{showCart && user ? <section className="section-wrap cart-page"><div className="section-heading"><div><p className="eyebrow">YOUR BAG</p><h1>Shopping cart</h1></div><button className="button button-outline" onClick={() => setShowCart(false)}>Continue shopping</button></div>{cart.length === 0 ? <div className="empty-state"><h2>Your cart is empty</h2><button className="button button-dark" onClick={() => setShowCart(false)}>Browse products</button></div> : <div className="cart-layout"><div className="cart-list">{cart.map((item) => <article className="cart-item" key={item.id}><div><h2>{item.product_name}</h2><p>{money(item.price)} × {item.quantity}</p></div><div className="cart-item-end"><strong>{money(Number(item.price) * item.quantity)}</strong><button className="remove-button" onClick={() => removeCartItem(item.id)}>Remove</button></div></article>)}</div><aside className="order-summary"><p className="eyebrow">SUMMARY</p><h2>Order summary</h2><div><span>Items ({itemCount})</span><span>{money(total)}</span></div><div className="summary-total"><strong>Total</strong><strong>{money(total)}</strong></div><button className="button button-dark button-full" onClick={() => { setError(''); setCheckoutOpen(true) }}>Checkout</button></aside></div>}</section> : <><section className="hero-section"><div><p className="eyebrow">EVERYDAY ESSENTIALS, BETTER</p><h1>Good things.<br /><em>Made simple.</em></h1><p className="hero-copy">A small collection of products selected for work, home, and everything in between.</p><button className="button button-dark" onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}>Shop the collection</button></div><div className="hero-orb"><span>ECART</span></div></section><section id="products" className="section-wrap products-section"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h1>Find your next favourite</h1></div><span className="product-count">{visibleProducts.length} products</span></div><div className="filters"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>{loading ? <p className="status-message">Loading products…</p> : error ? <div className="status-message"><p>{error}</p><button className="button button-outline" onClick={loadProducts}>Try again</button></div> : visibleProducts.length ? <ProductGrid /> : <p className="status-message">No products match your search.</p>}</section></>}</main><footer>© {new Date().getFullYear()} ECART · Shop with confidence</footer>
    </div>
}
export default App

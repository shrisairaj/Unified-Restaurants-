import React, { useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import '../../assets/styles/menuCard.css';
import MenuBackgroundImg from '../../assets/images/menu-background.png';
import Loader from '../Loader';

const types = {
    cover: 'COVER',
    category: 'CATEGORY',
    item: 'MENU_ITEM'
};

function MenuCard({
    data = {},
    currentOrder = {},
    name = '',
    tableNumber,
    handleClick = () => {},
    handleOnChange = () => {},
    tipAmount = 0,
    onTipAmountChange = () => {}
}) {
    const [isPlacing, setIsPlacing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isTipEnabled, setIsTipEnabled] = useState(false);
    const [customTip, setCustomTip] = useState('');

    const pagesList = useMemo(() => {
        if (!data || typeof data !== 'object') return [];
        return Object.keys(data)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => data[key]);
    }, [data]);

    const { categories, itemsByCategoryName } = useMemo(() => {
        const extractedCategories = [];
        const itemsMap = {};

        pagesList.forEach((page) => {
            if (!page?.type) return;

            if (page.type === types.category && Array.isArray(page.data)) {
                page.data.forEach((cat) => {
                    if (!cat?.id || !cat?.name) return;
                    extractedCategories.push({ id: cat.id, name: cat.name });
                });
            }

            if (page.type === types.item && Array.isArray(page.data)) {
                const categoryName = page.title;
                if (!categoryName) return;
                if (!itemsMap[categoryName]) itemsMap[categoryName] = [];
                itemsMap[categoryName].push(...page.data);
            }
        });

        return { categories: extractedCategories, itemsByCategoryName: itemsMap };
    }, [pagesList]);

    const hasLocalOverrides = useMemo(() => {
        return !!Object.keys(currentOrder || {}).find((key) => key !== 'lastUpdated');
    }, [currentOrder]);

    const getQuantityForMenuItem = (menuId) => Number(currentOrder?.[menuId]?.quantity) || 0;

    const cartItems = useMemo(() => {
        const local = currentOrder || {};
        const cart = [];

        Object.keys(local).forEach((id) => {
            if (id === 'lastUpdated') return;
            const qty = Number(local[id]?.quantity) || 0;
            if (qty <= 0) return;
            cart.push({
                id,
                name: local[id]?.menuName || local[id]?.name,
                price: local[id]?.price,
                quantity: qty
            });
        });

        return cart;
    }, [currentOrder]);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    }, [cartItems]);

    const sgst = useMemo(() => Math.round(cartTotal * (2.5 / 100)), [cartTotal]);
    const cgst = useMemo(() => Math.round(cartTotal * (2.5 / 100)), [cartTotal]);
    const normalizedTipAmount = useMemo(() => {
        if (!isTipEnabled) return 0;
        return Math.max(0, Number(tipAmount) || 0);
    }, [isTipEnabled, tipAmount]);

    const finalAmount = useMemo(() => {
        if (!cartItems.length) return 0;
        return cartTotal + sgst + cgst + normalizedTipAmount;
    }, [cartItems.length, cartTotal, cgst, sgst, normalizedTipAmount]);

    const visibleCategories = useMemo(() => {
        const query = searchText.trim().toLowerCase();

        return categories
            .map((category) => {
                const items = itemsByCategoryName[category.name] || [];
                if (!query) return { ...category, items };

                const categoryMatches = String(category.name || '').toLowerCase().includes(query);
                const filteredItems = categoryMatches
                    ? items
                    : items.filter((item) => String(item.name || '').toLowerCase().includes(query));

                return { ...category, items: filteredItems };
            })
            .filter((category) => category.items.length);
    }, [categories, itemsByCategoryName, searchText]);

    const handleProceedToPayment = () => {
        if (isPlacing || cartTotal <= 0) return;
        if (!hasLocalOverrides) return;
        setIsPlacing(true);
        handleClick({ action: 'place' });
        setTimeout(() => {
            setIsPlacing(false);
        }, 700);
    };

    const setMenuQuantity = (item, nextQuantity) => {
        handleOnChange({ target: { value: nextQuantity } }, item);
    };

    if (!pagesList.length) {
        return (
            <div className="d-flex justify-content-center w-100 h-100">
                <Card className="m-auto d-flex menu-container customer-order-loading">
                    <Card.Body className="d-flex align-items-center justify-content-center">
                        <Loader />
                    </Card.Body>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="d-flex justify-content-center w-100 h-100">
                <Card
                    className="menu-container customer-order-page"
                    style={{
                        backgroundImage: `linear-gradient(135deg, rgba(73,172,96,0.95), rgba(8,24,45,0.92)), url(${MenuBackgroundImg})`
                    }}
                >
                    <Card.Body className="customer-order-body">
                        <header className="customer-order-header">
                            <div className="customer-order-cafe-name">{name}</div>
                            <div className="customer-order-table">
                                Table {tableNumber ?? '-'}
                                <span className="customer-order-table-dot" />
                            </div>
                            <div className="customer-order-welcome">Tap Add to build your order</div>
                        </header>

                        <div className="customer-order-content">
                            {categories.length > 0 && (
                                <div className="customer-search-wrap">
                                    <input
                                        className="customer-search-input"
                                        type="search"
                                        value={searchText}
                                        placeholder="Search food items..."
                                        onChange={(event) => setSearchText(event.target.value)}
                                    />
                                </div>
                            )}

                            {categories.length === 0 ? (
                                <div className="text-center text-white my-5">
                                    <h5>No menu items available at the moment.</h5>
                                    <p className="text-muted">Please check back later or ask the staff.</p>
                                </div>
                            ) : visibleCategories.length === 0 ? (
                                <div className="customer-food-empty">No food items found</div>
                            ) : (
                                visibleCategories.map((category) => {
                                    const items = category.items;
                                    return (
                                        <section key={category.id} className="customer-category-section">
                                            <div className="customer-category-title">{category.name}</div>
                                            <div className="customer-items-grid">
                                                {items.map((item) => {
                                                    const quantity = getQuantityForMenuItem(item.id);
                                                    return (
                                                        <div key={item.id} className="customer-food-card">
                                                            <div className="customer-food-media" aria-hidden="true">
                                                                {String(item.name || '')
                                                                    .trim()
                                                                    .slice(0, 1)
                                                                    .toUpperCase()}
                                                            </div>

                                                            <div className="customer-food-info">
                                                                <div className="customer-food-name">{item.name}</div>
                                                                <div className="customer-food-price">₹ {item.price}</div>
                                                            </div>

                                                            <div className="customer-food-action">
                                                                {quantity > 0 ? (
                                                                    <div className="qty-control" role="group" aria-label={`Quantity for ${item.name}`}>
                                                                        <Button
                                                                            className="qty-btn"
                                                                            onClick={() => setMenuQuantity(item, Math.max(0, quantity - 1))}
                                                                            aria-label={`Decrease ${item.name} quantity`}
                                                                        >
                                                                            -
                                                                        </Button>
                                                                        <div className="qty-value" aria-live="polite">
                                                                            {quantity}
                                                                        </div>
                                                                        <Button
                                                                            className="qty-btn"
                                                                            onClick={() => setMenuQuantity(item, quantity + 1)}
                                                                            aria-label={`Increase ${item.name} quantity`}
                                                                        >
                                                                            +
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        className="customer-add-btn"
                                                                        onClick={() => setMenuQuantity(item, 1)}
                                                                        aria-label={`Add ${item.name}`}
                                                                    >
                                                                        Add
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })
                            )}
                        </div>
                    </Card.Body>
                </Card>
            </div>

            <div className="customer-order-cart" role="region" aria-label="Cart and payment">
                <div className="customer-order-cart-inner">
                    <div className="cart-header">
                        <div className="cart-title">Your Cart</div>
                        <div className="cart-total">
                            ₹ {finalAmount}
                        </div>
                    </div>

                    {cartItems.length ? (
                        <div className="cart-items">
                            {cartItems.map((item) => (
                                <div key={item.id} className="cart-item-row">
                                    <div className="cart-item-name">{item.name}</div>
                                    <div className="cart-item-qty">
                                        {item.quantity} x ₹ {item.price}
                                    </div>
                                </div>
                            ))}
                            <div className="cart-tax-divider" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
                            <div className="cart-item-row" style={{ opacity: 0.8, fontSize: '0.9em' }}>
                                <div className="cart-item-name">Subtotal</div>
                                <div className="cart-item-qty">₹ {cartTotal}</div>
                            </div>
                            <div className="cart-item-row" style={{ opacity: 0.9, fontSize: '0.9em', alignItems: 'center' }}>
                                <label className="cart-item-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={isTipEnabled}
                                        onChange={(event) => {
                                            const nextEnabled = event.target.checked;
                                            setIsTipEnabled(nextEnabled);
                                            if (!nextEnabled) {
                                                setCustomTip('');
                                                onTipAmountChange(0);
                                            }
                                        }}
                                    />
                                    Add Tip
                                </label>
                                <div className="cart-item-qty">₹ {normalizedTipAmount}</div>
                            </div>
                            {isTipEnabled && (
                                <div style={{ marginTop: '6px', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {[20, 50, 100].map((amount) => (
                                            <Button
                                                key={amount}
                                                variant={normalizedTipAmount === amount ? 'light' : 'outline-light'}
                                                size="sm"
                                                onClick={() => {
                                                    setCustomTip('');
                                                    onTipAmountChange(amount);
                                                }}
                                            >
                                                ₹{amount}
                                            </Button>
                                        ))}
                                        <input
                                            type="number"
                                            min="0"
                                            value={customTip}
                                            placeholder="Custom Amount"
                                            className="form-control form-control-sm"
                                            style={{ maxWidth: '150px' }}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                setCustomTip(next);
                                                onTipAmountChange(Math.max(0, Number(next) || 0));
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="cart-item-row" style={{ opacity: 0.8, fontSize: '0.9em' }}>
                                <div className="cart-item-name">CGST (2.5%)</div>
                                <div className="cart-item-qty">₹ {cgst}</div>
                            </div>
                            <div className="cart-item-row" style={{ opacity: 0.8, fontSize: '0.9em' }}>
                                <div className="cart-item-name">SGST (2.5%)</div>
                                <div className="cart-item-qty">₹ {sgst}</div>
                            </div>
                            <div className="cart-item-row" style={{ fontWeight: 'bold' }}>
                                <div className="cart-item-name">Final Amount</div>
                                <div className="cart-item-qty">₹ {finalAmount}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="cart-empty">Add items to see your total.</div>
                    )}

                    <div className="cart-footer">
                        <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                            No refund will be provided once payment is completed.
                        </div>
                        <Button
                            className="cart-proceed-btn"
                            disabled={cartTotal <= 0 || isPlacing}
                            onClick={handleProceedToPayment}
                        >
                            {isPlacing ? 'Processing...' : 'Proceed to Payment'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default MenuCard;

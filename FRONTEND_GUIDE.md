# Acocie Stores — Frontend Guide

> Complete API Reference + React/Vite Frontend Architecture + Design Prompt  
> Backend base URL: `http://localhost:5000/api/v1`  
> All protected routes require: `Authorization: Bearer <access_token>`

---

## Table of Contents

1. [API Reference](#api-reference)
   - [Auth](#1-auth--apiv1auth)
   - [Users](#2-users--apiv1users)
   - [Admin Users](#3-admin-users--apiv1admin)
   - [Categories](#4-categories--apiv1categories)
   - [Products](#5-products--apiv1products)
   - [Cart](#6-cart--apiv1cart)
   - [Checkout](#7-checkout--apiv1checkout)
   - [Orders (Customer)](#8-orders-customer--apiv1orders)
   - [Vendor Orders](#9-vendor-orders--apiv1vendor)
   - [Admin Orders](#10-admin-orders--apiv1admin-orders)
2. [React + Vite Frontend Architecture](#react--vite-frontend-architecture)
3. [Figma / Void AI Design Prompt](#figma--void-ai-design-prompt)

---

## API Reference

### Legend

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public — no token required |
| 🔒 | Requires Bearer token |
| 🛡️ | Requires `admin` or `super_admin` role |
| 🏪 | Requires `vendor`, `admin`, or `super_admin` role |
| ❓ | Token optional (guest or authenticated) |

---

### 1. Auth — `/api/v1/auth`

#### `POST /register` 🔓
Register a new customer account. Sends an OTP email for verification.

**Request Body**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "phone": "+263771234567"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email with the OTP sent.",
  "data": {
    "userId": "uuid",
    "email": "jane@example.com"
  }
}
```

---

#### `POST /verify-otp` 🔓
Verify account using the OTP sent during registration.

**Request Body**
```json
{
  "email": "jane@example.com",
  "otp": "482910"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "role": "customer",
      "isVerified": true
    }
  }
}
```

---

#### `POST /login` 🔓
Authenticate with email and password.

**Request Body**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "role": "customer",
      "isVerified": true
    }
  }
}
```

---

#### `POST /refresh-token` 🔓
Exchange a refresh token for a new access token.

**Request Body**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ..."
  }
}
```

---

#### `POST /forgot-password` 🔓
Request a password-reset OTP sent to email.

**Request Body**
```json
{
  "email": "jane@example.com"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email."
}
```

---

#### `POST /verify-reset-otp` 🔓
Verify the password-reset OTP. Returns a short-lived reset token.

**Request Body**
```json
{
  "email": "jane@example.com",
  "otp": "193847"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "resetToken": "uuid-or-signed-token"
  }
}
```

---

#### `POST /reset-password` 🔓
Set a new password using the reset token.

**Request Body**
```json
{
  "resetToken": "uuid-or-signed-token",
  "newPassword": "NewSecure456!"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Password reset successfully."
}
```

---

#### `POST /logout` 🔒
Invalidate the current refresh token.

**Request Body**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

#### `POST /change-password` 🔒
Change password while authenticated.

**Request Body**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecure456!"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

---

### 2. Users — `/api/v1/users`

All routes require `Authorization: Bearer <token>`.

#### `GET /profile` 🔒
Get the authenticated user's profile.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+263771234567",
    "role": "customer",
    "isVerified": true,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

#### `PUT /profile` 🔒
Update profile details.

**Request Body** *(all fields optional)*
```json
{
  "firstName": "Janet",
  "lastName": "Smith",
  "phone": "+263779876543"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": { "...updated user object..." }
}
```

---

#### `DELETE /delete` 🔒
Soft-delete the authenticated user's account.

**Response `200`**
```json
{
  "success": true,
  "message": "Account deleted successfully."
}
```

---

#### `GET /addresses` 🔒
List all saved addresses.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "label": "Home",
      "street": "123 Main St",
      "city": "Harare",
      "province": "Harare Province",
      "country": "Zimbabwe",
      "postalCode": "00263",
      "isDefault": true
    }
  ]
}
```

---

#### `POST /addresses` 🔒
Add a new address.

**Request Body**
```json
{
  "label": "Work",
  "street": "456 Office Rd",
  "city": "Bulawayo",
  "province": "Matabeleland North",
  "country": "Zimbabwe",
  "postalCode": "00000",
  "isDefault": false
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Address added.",
  "data": { "...address object..." }
}
```

---

#### `PUT /addresses/:id` 🔒
Update an existing address.

**Request Body** *(partial update supported)*
```json
{
  "label": "Old Home",
  "isDefault": false
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Address updated.",
  "data": { "...updated address..." }
}
```

---

#### `DELETE /addresses/:id` 🔒
Delete an address.

**Response `200`**
```json
{
  "success": true,
  "message": "Address deleted."
}
```

---

#### `GET /login-history` 🔒
Get recent login activity for the account.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ipAddress": "102.0.1.5",
      "userAgent": "Mozilla/5.0 ...",
      "loginAt": "2024-03-10T08:30:00.000Z",
      "success": true
    }
  ]
}
```

---

### 3. Admin Users — `/api/v1/admin`

All routes require admin or super_admin role.

#### `GET /users` 🛡️
List all users with pagination and filtering.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `role` | string | Filter by role |
| `status` | string | Filter by status (`active`, `inactive`, `suspended`) |
| `search` | string | Search by name or email |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "users": [ { "...user objects..." } ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

---

#### `GET /users/:id` 🛡️
Get a single user by ID.

**Response `200`**
```json
{
  "success": true,
  "data": { "...full user object with addresses..." }
}
```

---

#### `PUT /users/:id/status` 🛡️
Activate, deactivate, or suspend a user.

**Request Body**
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "User status updated to suspended."
}
```

---

#### `PUT /users/:id/role` 🛡️
Change a user's role.

**Request Body**
```json
{
  "role": "vendor"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "User role updated to vendor."
}
```

---

#### `DELETE /users/:id` 🛡️
Delete a user account.

**Response `200`**
```json
{
  "success": true,
  "message": "User deleted successfully."
}
```

---

#### `GET /dashboard/stats` 🛡️
Admin dashboard statistics summary.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1200,
    "newUsersThisMonth": 45,
    "totalOrders": 3400,
    "totalRevenue": 125000.00,
    "pendingOrders": 12,
    "activeVendors": 30
  }
}
```

---

### 4. Categories — `/api/v1/categories`

#### `GET /` 🔓
Get all categories, optionally with products included.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `includeProducts` | boolean | Include products in response |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Gadgets and devices",
      "imageUrl": "https://...",
      "productCount": 42
    }
  ]
}
```

---

#### `GET /:id` 🔓
Get a single category.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `includeProducts` | boolean | Include related products |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "slug": "electronics",
    "description": "Gadgets and devices",
    "imageUrl": "https://...",
    "products": [ { "...if requested..." } ]
  }
}
```

---

#### `POST /` 🛡️
Create a new category.

**Request Body**
```json
{
  "name": "Fashion",
  "description": "Clothing and accessories",
  "imageUrl": "https://cdn.example.com/fashion.jpg"
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Category created.",
  "data": { "...category object..." }
}
```

---

#### `PUT /:id` 🛡️
Update a category.

**Request Body** *(partial update)*
```json
{
  "description": "Updated clothing description",
  "imageUrl": "https://cdn.example.com/fashion-v2.jpg"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Category updated.",
  "data": { "...updated category..." }
}
```

---

#### `DELETE /:id` 🛡️
Delete a category.

**Response `200`**
```json
{
  "success": true,
  "message": "Category deleted."
}
```

---

### 5. Products — `/api/v1/products`

#### `GET /` 🔓
List all products with pagination and filters.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `categoryId` | uuid | Filter by category |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `inStock` | boolean | Only show in-stock items |
| `sortBy` | string | `price_asc`, `price_desc`, `newest`, `popular` |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "description": "...",
        "price": 49.99,
        "compareAtPrice": 79.99,
        "isFeatured": true,
        "category": { "id": "uuid", "name": "Electronics" },
        "images": [ { "url": "https://...", "isPrimary": true } ],
        "variants": [
          { "id": "uuid", "name": "Black", "sku": "WH-BLK", "price": 49.99, "inventory": { "quantity": 20 } }
        ]
      }
    ],
    "pagination": { "total": 200, "page": 1, "limit": 20, "totalPages": 10 }
  }
}
```

---

#### `GET /search` 🔓
Full-text search for products.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (required) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response `200`** — same shape as `GET /`

---

#### `GET /featured` 🔓
Get featured/promoted products.

**Response `200`** — array of product objects with `isFeatured: true`

---

#### `GET /:id` 🔓
Get a single product with full details.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Wireless Headphones",
    "description": "Long description...",
    "price": 49.99,
    "compareAtPrice": 79.99,
    "isFeatured": false,
    "vendor": { "id": "uuid", "firstName": "John", "lastName": "Vendor" },
    "category": { "id": "uuid", "name": "Electronics" },
    "images": [ { "url": "https://...", "isPrimary": true, "sortOrder": 0 } ],
    "variants": [
      {
        "id": "uuid",
        "name": "Black / Large",
        "sku": "WH-BLK-L",
        "price": 49.99,
        "inventory": { "quantity": 15, "reservedQuantity": 2 }
      }
    ]
  }
}
```

---

#### `POST /` 🏪
Create a product (vendor or admin only).

**Request Body**
```json
{
  "name": "Smart Watch",
  "description": "Feature-rich smartwatch with heart rate monitoring.",
  "price": 129.99,
  "compareAtPrice": 199.99,
  "categoryId": "uuid",
  "isFeatured": false,
  "images": [
    { "url": "https://cdn.example.com/watch.jpg", "isPrimary": true, "sortOrder": 0 }
  ],
  "variants": [
    {
      "name": "Black",
      "sku": "SW-BLK",
      "price": 129.99,
      "initialStock": 50
    }
  ]
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Product created.",
  "data": { "...full product object..." }
}
```

---

#### `PUT /:id` 🏪
Update a product.

**Request Body** *(partial update)*
```json
{
  "price": 119.99,
  "isFeatured": true
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Product updated.",
  "data": { "...updated product..." }
}
```

---

#### `DELETE /:id` 🏪
Delete a product.

**Response `200`**
```json
{
  "success": true,
  "message": "Product deleted."
}
```

---

### 6. Cart — `/api/v1/cart`

Cart supports both guest (session-based) and authenticated users. Pass a Bearer token when available.

#### `GET /` ❓
Get the current cart contents.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "guest-session-id-or-null",
    "items": [
      {
        "id": "uuid",
        "productVariantId": "uuid",
        "quantity": 2,
        "unitPrice": 49.99,
        "totalPrice": 99.98,
        "product": { "name": "Wireless Headphones", "imageUrl": "https://..." },
        "variant": { "name": "Black", "sku": "WH-BLK" }
      }
    ],
    "subtotal": 99.98,
    "itemCount": 2
  }
}
```

---

#### `POST /items` ❓
Add an item to the cart.

**Request Body**
```json
{
  "productVariantId": "uuid",
  "quantity": 1
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Item added to cart.",
  "data": { "...updated cart..." }
}
```

---

#### `PUT /items/:id` ❓
Update cart item quantity.

**Request Body**
```json
{
  "quantity": 3
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Cart item updated.",
  "data": { "...updated cart..." }
}
```

---

#### `DELETE /items/:id` ❓
Remove an item from the cart.

**Response `200`**
```json
{
  "success": true,
  "message": "Item removed from cart."
}
```

---

#### `DELETE /clear` ❓
Remove all items from the cart.

**Response `200`**
```json
{
  "success": true,
  "message": "Cart cleared."
}
```

---

#### `GET /validate` ❓
Validate cart items (check stock availability, price changes).

**Response `200`**
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "issues": [
      {
        "cartItemId": "uuid",
        "type": "OUT_OF_STOCK",
        "message": "Wireless Headphones (Black) is out of stock."
      }
    ]
  }
}
```

---

#### `POST /merge` 🔒
Merge a guest cart into the authenticated user's cart after login.

**Request Body**
```json
{
  "sessionId": "guest-session-uuid"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Carts merged successfully.",
  "data": { "...merged cart..." }
}
```

---

### 7. Checkout — `/api/v1/checkout`

All routes require authentication.

#### `POST /initiate` 🔒
Start the checkout process. Validates the cart and reserves stock.

**Request Body**
```json
{}
```
*(no body required — uses the authenticated user's cart)*

**Response `200`**
```json
{
  "success": true,
  "data": {
    "checkoutId": "uuid",
    "cartSummary": {
      "items": [ { "...cart items..." } ],
      "subtotal": 99.98
    },
    "savedAddresses": [ { "...user addresses..." } ]
  }
}
```

---

#### `GET /summary` 🔒
Get the checkout summary including shipping and total calculation.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `addressId` | uuid | Selected shipping address |
| `promoCode` | string | Optional promo/coupon code |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "subtotal": 99.98,
    "shippingFee": 5.00,
    "discount": 10.00,
    "total": 94.98,
    "promoApplied": {
      "code": "SAVE10",
      "discountAmount": 10.00
    }
  }
}
```

---

#### `POST /place-order` 🔒
Place the order and create it in the system.

**Request Body**
```json
{
  "addressId": "uuid",
  "paymentMethod": "cash_on_delivery",
  "promoCode": "SAVE10",
  "notes": "Please leave at the door."
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Order placed successfully.",
  "data": {
    "orderId": "uuid",
    "orderNumber": "ACO-20240315-0001",
    "total": 94.98,
    "status": "pending",
    "estimatedDelivery": "2024-03-18"
  }
}
```

---

### 8. Orders (Customer) — `/api/v1/orders`

All routes require authentication.

#### `GET /` 🔒
Get the authenticated user's order history.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by order status |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ACO-20240315-0001",
        "status": "delivered",
        "total": 94.98,
        "itemCount": 2,
        "createdAt": "2024-03-15T09:00:00.000Z"
      }
    ],
    "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
  }
}
```

---

#### `GET /stats` 🔒
Get the user's order statistics.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalOrders": 12,
    "totalSpent": 890.00,
    "pendingOrders": 1,
    "deliveredOrders": 10,
    "cancelledOrders": 1
  }
}
```

---

#### `GET /number/:orderNumber` 🔒
Lookup an order by its human-readable order number.

**Response `200`** — same as `GET /:id`

---

#### `GET /:id` 🔒
Get full order details.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ACO-20240315-0001",
    "status": "shipped",
    "subtotal": 99.98,
    "shippingFee": 5.00,
    "discount": 10.00,
    "total": 94.98,
    "paymentMethod": "cash_on_delivery",
    "shippingAddress": { "...address object..." },
    "items": [
      {
        "id": "uuid",
        "productName": "Wireless Headphones",
        "variantName": "Black",
        "quantity": 2,
        "unitPrice": 49.99,
        "totalPrice": 99.98,
        "imageUrl": "https://..."
      }
    ],
    "createdAt": "2024-03-15T09:00:00.000Z"
  }
}
```

---

#### `GET /:id/tracking` 🔒
Get shipment tracking information for an order.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "orderNumber": "ACO-20240315-0001",
    "carrier": "DHL",
    "trackingNumber": "1234567890",
    "trackingUrl": "https://dhl.com/track/1234567890",
    "currentStatus": "In Transit",
    "history": [
      { "status": "Order Placed", "timestamp": "2024-03-15T09:00:00.000Z", "note": "" },
      { "status": "Shipped", "timestamp": "2024-03-16T14:00:00.000Z", "note": "Dispatched from warehouse" }
    ]
  }
}
```

---

#### `POST /:id/cancel` 🔒
Request cancellation of an order.

**Request Body**
```json
{
  "reason": "Changed my mind",
  "notes": "Please process the refund quickly."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Cancellation request submitted.",
  "data": { "cancellationId": "uuid", "status": "pending" }
}
```

---

#### `POST /:id/return` 🔒
Request a return for a delivered order.

**Request Body**
```json
{
  "reason": "Item damaged on arrival",
  "notes": "The screen has a crack."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Return request submitted.",
  "data": { "returnId": "uuid", "status": "pending" }
}
```

---

#### `POST /:id/notes` 🔒
Add a customer note to an order.

**Request Body**
```json
{
  "note": "Please call before delivery."
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Note added.",
  "data": { "id": "uuid", "note": "Please call before delivery.", "createdAt": "..." }
}
```

---

### 9. Vendor Orders — `/api/v1/vendor`

Requires `vendor`, `admin`, or `super_admin` role.

#### `GET /orders` 🏪
Get all orders assigned to the vendor.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by order status |

**Response `200`** — paginated list of order objects belonging to the vendor

---

#### `GET /dashboard/stats` 🏪
Get vendor dashboard statistics.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalOrders": 45,
    "pendingOrders": 3,
    "activeOrders": 8,
    "deliveredOrders": 32,
    "totalRevenue": 4500.00,
    "thisMonthRevenue": 800.00
  }
}
```

---

#### `GET /orders/:id` 🏪
Get details of a single vendor order.

**Response `200`** — full order object

---

#### `PUT /orders/:id/accept` 🏪
Accept a new order assigned to the vendor.

**Response `200`**
```json
{
  "success": true,
  "message": "Order accepted.",
  "data": { "orderId": "uuid", "status": "confirmed" }
}
```

---

#### `PUT /orders/:id/ship` 🏪
Mark an order as shipped.

**Request Body**
```json
{
  "carrier": "DHL",
  "trackingNumber": "1234567890",
  "trackingUrl": "https://dhl.com/track/1234567890",
  "estimatedDelivery": "2024-03-18"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Order marked as shipped.",
  "data": { "orderId": "uuid", "status": "shipped" }
}
```

---

#### `PUT /orders/:id/deliver` 🏪
Mark an order as delivered.

**Response `200`**
```json
{
  "success": true,
  "message": "Order marked as delivered.",
  "data": { "orderId": "uuid", "status": "delivered" }
}
```

---

#### `PUT /orders/:id/tracking` 🏪
Update tracking information after shipment.

**Request Body**
```json
{
  "carrier": "FedEx",
  "trackingNumber": "9876543210",
  "trackingUrl": "https://fedex.com/track/9876543210",
  "estimatedDelivery": "2024-03-19"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Tracking information updated."
}
```

---

#### `POST /orders/:id/notes` 🏪
Add an internal vendor note to an order.

**Request Body**
```json
{
  "note": "Customer called to confirm address."
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Note added.",
  "data": { "id": "uuid", "note": "...", "createdAt": "..." }
}
```

---

### 10. Admin Orders — `/api/v1/admin-orders`

Requires `admin` or `super_admin` role.

#### `GET /orders` 🛡️
Get all orders in the system with filters.

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by status |
| `vendorId` | uuid | Filter by vendor |
| `dateFrom` | date | Start date filter |
| `dateTo` | date | End date filter |

**Response `200`** — paginated list of all orders

---

#### `GET /dashboard/orders` 🛡️
Admin orders dashboard & analytics data.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "totalOrders": 3400,
    "todayOrders": 25,
    "pendingOrders": 12,
    "revenueToday": 2100.00,
    "revenueThisMonth": 45000.00,
    "ordersByStatus": {
      "pending": 12,
      "confirmed": 30,
      "shipped": 55,
      "delivered": 3250,
      "cancelled": 53
    }
  }
}
```

---

#### `GET /orders/:id` 🛡️
Get full order details including admin notes.

**Response `200`** — complete order object

---

#### `PUT /orders/:id/status` 🛡️
Manually update an order's status.

**Request Body**
```json
{
  "status": "confirmed",
  "note": "Manually confirmed by admin after payment verification."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Order status updated to confirmed."
}
```

---

#### `PUT /orders/:id/confirm` 🛡️
Confirm an order (dedicated confirm action).

**Request Body**
```json
{
  "note": "Payment verified via bank transfer."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Order confirmed."
}
```

---

#### `GET /orders/:id/history` 🛡️
Get the full status change history of an order.

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "status": "pending", "changedBy": "system", "changedAt": "2024-03-15T09:00:00.000Z", "note": "" },
    { "status": "confirmed", "changedBy": "admin-uuid", "changedAt": "2024-03-15T10:30:00.000Z", "note": "Verified" }
  ]
}
```

---

#### `POST /orders/:id/notes` 🛡️
Add an admin internal note to an order.

**Request Body**
```json
{
  "note": "Escalated to logistics team.",
  "isInternal": true
}
```

**Response `201`**
```json
{
  "success": true,
  "message": "Admin note added.",
  "data": { "id": "uuid", "note": "...", "createdAt": "..." }
}
```

---

#### `GET /orders/cancellations` 🛡️
List all pending cancellation requests.

**Response `200`** — array of cancellation request objects with linked order data

---

#### `PUT /orders/cancellations/:id` 🛡️
Approve or reject a cancellation request.

**Request Body**
```json
{
  "action": "approve",
  "note": "Approved — refund issued."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Cancellation approved."
}
```

---

#### `GET /orders/returns` 🛡️
List all pending return requests.

**Response `200`** — array of return request objects

---

#### `PUT /orders/returns/:id` 🛡️
Process a return request.

**Request Body**
```json
{
  "action": "approve",
  "note": "Approved — replacement dispatched."
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Return approved."
}
```

---

#### `POST /orders/:id/refund` 🛡️
Issue a refund for an order.

**Request Body**
```json
{
  "amount": 94.98,
  "reason": "Product not received.",
  "method": "original_payment_method"
}
```

**Response `200`**
```json
{
  "success": true,
  "message": "Refund of $94.98 processed.",
  "data": { "refundId": "uuid", "amount": 94.98, "processedAt": "..." }
}
```

---

## React + Vite Frontend Architecture

### Tech Stack

| Concern | Library |
|---------|---------|
| UI Framework | React 18 |
| Build Tool | Vite 5 |
| Routing | React Router v6 |
| Server State | TanStack Query v5 (react-query) |
| Client State | Zustand |
| HTTP Client | Axios |
| Styling | Tailwind CSS v3 |
| Form Handling | React Hook Form + Zod |
| Notifications | react-hot-toast |
| Icons | lucide-react |
| Date Formatting | date-fns |

---

### Folder Structure

```
acocie-stores-frontend/
├── public/
│   └── logo.svg
├── src/
│   ├── api/
│   │   ├── axios.js            # Axios instance + interceptors
│   │   ├── auth.api.js         # /auth endpoints
│   │   ├── users.api.js        # /users endpoints
│   │   ├── products.api.js     # /products endpoints
│   │   ├── categories.api.js   # /categories endpoints
│   │   ├── cart.api.js         # /cart endpoints
│   │   ├── checkout.api.js     # /checkout endpoints
│   │   ├── orders.api.js       # /orders endpoints
│   │   ├── vendor.api.js       # /vendor endpoints
│   │   └── admin.api.js        # /admin + /admin-orders endpoints
│   ├── components/
│   │   ├── ui/                 # Design system atoms (Button, Input, Badge, Modal, etc.)
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Sidebar.jsx     # Vendor/Admin sidebar
│   │   │   └── PageWrapper.jsx
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   └── OTPInput.jsx
│   │   ├── product/
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── ProductImages.jsx
│   │   │   ├── VariantSelector.jsx
│   │   │   └── ProductFilters.jsx
│   │   ├── cart/
│   │   │   ├── CartDrawer.jsx
│   │   │   └── CartItem.jsx
│   │   ├── order/
│   │   │   ├── OrderCard.jsx
│   │   │   ├── OrderStatusBadge.jsx
│   │   │   └── TrackingTimeline.jsx
│   │   └── admin/
│   │       ├── StatsCard.jsx
│   │       └── DataTable.jsx
│   ├── pages/
│   │   ├── public/
│   │   │   ├── HomePage.jsx
│   │   │   ├── ProductsPage.jsx
│   │   │   ├── ProductDetailPage.jsx
│   │   │   └── CategoryPage.jsx
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── VerifyOTPPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── VerifyResetOTPPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   ├── customer/
│   │   │   ├── CartPage.jsx
│   │   │   ├── CheckoutPage.jsx
│   │   │   ├── OrderHistoryPage.jsx
│   │   │   ├── OrderDetailPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── AddressesPage.jsx
│   │   ├── vendor/
│   │   │   ├── VendorDashboardPage.jsx
│   │   │   ├── VendorOrdersPage.jsx
│   │   │   ├── VendorOrderDetailPage.jsx
│   │   │   └── VendorProductsPage.jsx
│   │   └── admin/
│   │       ├── AdminDashboardPage.jsx
│   │       ├── AdminUsersPage.jsx
│   │       ├── AdminUserDetailPage.jsx
│   │       ├── AdminOrdersPage.jsx
│   │       ├── AdminOrderDetailPage.jsx
│   │       ├── AdminCancellationsPage.jsx
│   │       ├── AdminReturnsPage.jsx
│   │       └── AdminCategoriesPage.jsx
│   ├── store/
│   │   ├── authStore.js        # Zustand — user, tokens, login/logout actions
│   │   └── cartStore.js        # Zustand — guest session ID, item count
│   ├── hooks/
│   │   ├── useAuth.js          # Current user, role helpers
│   │   ├── useCart.js          # Cart query + mutations
│   │   ├── useProducts.js      # Products queries
│   │   └── useOrders.js        # Orders queries
│   ├── router/
│   │   ├── index.jsx           # createBrowserRouter config
│   │   ├── PublicRoute.jsx     # Redirect if already logged in
│   │   ├── PrivateRoute.jsx    # Redirect to login if not authenticated
│   │   └── RoleRoute.jsx       # Redirect if wrong role
│   ├── utils/
│   │   ├── formatCurrency.js
│   │   ├── formatDate.js
│   │   └── orderStatus.js      # Status colour mappings
│   ├── App.jsx
│   └── main.jsx
├── .env
├── index.html
├── tailwind.config.js
└── vite.config.js
```

---

### Axios Setup (with Auto-Refresh)

```js
// src/api/axios.js
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
          { refreshToken }
        );
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### Zustand Auth Store

```js
// src/store/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'acocie-auth' }
  )
);
```

---

### Role-Based Route Guard

```jsx
// src/router/RoleRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ROLE_HIERARCHY = { customer: 1, vendor: 2, admin: 3, super_admin: 4 };

export default function RoleRoute({ allowedRoles, children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
```

---

### Router Configuration (outline)

```jsx
// src/router/index.jsx
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  // Public
  { path: '/',               element: <HomePage /> },
  { path: '/products',       element: <ProductsPage /> },
  { path: '/products/:id',   element: <ProductDetailPage /> },
  { path: '/categories/:id', element: <CategoryPage /> },

  // Auth
  { path: '/login',              element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/register',           element: <PublicRoute><RegisterPage /></PublicRoute> },
  { path: '/verify-otp',         element: <VerifyOTPPage /> },
  { path: '/forgot-password',    element: <ForgotPasswordPage /> },
  { path: '/reset-password',     element: <ResetPasswordPage /> },

  // Customer (private)
  { path: '/cart',               element: <PrivateRoute><CartPage /></PrivateRoute> },
  { path: '/checkout',           element: <PrivateRoute><CheckoutPage /></PrivateRoute> },
  { path: '/orders',             element: <PrivateRoute><OrderHistoryPage /></PrivateRoute> },
  { path: '/orders/:id',         element: <PrivateRoute><OrderDetailPage /></PrivateRoute> },
  { path: '/profile',            element: <PrivateRoute><ProfilePage /></PrivateRoute> },
  { path: '/profile/addresses',  element: <PrivateRoute><AddressesPage /></PrivateRoute> },

  // Vendor (role-gated)
  {
    path: '/vendor',
    element: <RoleRoute allowedRoles={['vendor','admin','super_admin']}><VendorLayout /></RoleRoute>,
    children: [
      { index: true,           element: <VendorDashboardPage /> },
      { path: 'orders',        element: <VendorOrdersPage /> },
      { path: 'orders/:id',    element: <VendorOrderDetailPage /> },
      { path: 'products',      element: <VendorProductsPage /> },
    ]
  },

  // Admin (role-gated)
  {
    path: '/admin',
    element: <RoleRoute allowedRoles={['admin','super_admin']}><AdminLayout /></RoleRoute>,
    children: [
      { index: true,                element: <AdminDashboardPage /> },
      { path: 'users',              element: <AdminUsersPage /> },
      { path: 'users/:id',          element: <AdminUserDetailPage /> },
      { path: 'orders',             element: <AdminOrdersPage /> },
      { path: 'orders/:id',         element: <AdminOrderDetailPage /> },
      { path: 'cancellations',      element: <AdminCancellationsPage /> },
      { path: 'returns',            element: <AdminReturnsPage /> },
      { path: 'categories',         element: <AdminCategoriesPage /> },
    ]
  },
]);
```

---

### Cart Flow (Guest → Authenticated)

1. Guest visits site → `GET /cart` without token → backend uses `sessionId` cookie or header
2. Guest adds items → items stored against guest session
3. Guest registers/logs in → call `POST /cart/merge` with `{ sessionId }` → server combines carts
4. Store `sessionId` in `localStorage` before login, clear after merge

---

### Environment Variables (`.env`)

```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Figma / Void AI Design Prompt

> Copy and paste the block below directly into Figma AI, Void AI, or any AI design tool.

---

```
Design a complete multi-vendor e-commerce web application called "Acocie Stores".

BRAND
- Name: Acocie Stores
- Tagline: "Shop Smart. Shop Local."
- Tone: Modern, clean, trustworthy, approachable
- Primary colour: Deep Indigo #4F46E5
- Secondary colour: Warm Amber #F59E0B
- Accent: Emerald Green #10B981 (success states, "in stock")
- Danger: Red #EF4444 (errors, cancel, out of stock)
- Neutrals: #F9FAFB (bg), #F3F4F6 (card bg), #6B7280 (muted text), #111827 (headings)
- Font: Inter (all weights)
- Border radius: 8px cards, 6px buttons, 4px inputs
- Shadow: subtle card shadows (0 1px 3px rgba(0,0,0,0.08))

PAGES TO DESIGN

1. Landing / Home Page
   - Sticky navbar: logo left, search bar center, cart icon + user avatar right
   - Hero banner: full-width image with headline, CTA button "Shop Now"
   - Category pills / icon grid (scrollable row)
   - Featured Products grid (3–4 columns, product cards with image, name, price, "Add to Cart")
   - Promotional banner (wide gradient strip)
   - Footer: links, social icons, newsletter input

2. Product Catalogue Page
   - Left sidebar: filters (category, price range slider, in-stock toggle, sort by)
   - Right: product grid (responsive 2–4 cols)
   - Each product card: image, product name, vendor name, price, compare-at price (strikethrough), rating stars
   - Pagination at bottom

3. Product Detail Page
   - Left: image gallery with thumbnails
   - Right: product name, vendor badge, price, compare-at price, variant selector (colour/size chips), quantity spinner, "Add to Cart" primary button, "Buy Now" secondary button
   - Tabs below: Description, Reviews, Shipping Info
   - Related products row at bottom

4. Cart Page (Drawer + Full Page)
   - List of cart items: image, name, variant, quantity stepper, remove icon, line total
   - Order summary sidebar: subtotal, shipping, total, "Proceed to Checkout" CTA
   - Empty state with illustration and "Continue Shopping" link

5. Checkout Page (3-step wizard)
   - Step 1 — Shipping: select saved address OR add new, address form
   - Step 2 — Review: order items summary + selected address
   - Step 3 — Confirm: payment method selection (cash on delivery, etc.), promo code input, place order button
   - Progress stepper at top

6. Order History Page
   - List of order cards: order number, date, status badge (colour coded), item count, total, "View Details" link
   - Filter tabs at top: All, Pending, Shipped, Delivered, Cancelled

7. Order Detail Page
   - Order number + date header
   - Delivery address block
   - Items table: image, name, variant, qty, price
   - Price breakdown: subtotal, shipping, discount, total
   - Tracking timeline (vertical stepper with status steps and timestamps)
   - Customer notes section
   - Cancel / Return request button (contextual — only show when relevant)

8. Customer Profile Page
   - Avatar + name + email header
   - Edit profile form (first/last name, phone)
   - Change password section
   - Saved addresses list with edit/delete + add new
   - Login history table

9. Vendor Dashboard
   - Sidebar navigation (Dashboard, Orders, Products, Settings)
   - Stats row: Total Orders, Pending, Active, Revenue This Month (KPI cards)
   - Recent orders table: order #, customer, total, status, action buttons (Accept / Ship / Deliver)
   - Revenue chart (line graph, last 7 days)

10. Vendor Order Detail Page
    - Same layout as customer order detail
    - Extra actions panel: Accept Order button, Ship Order form (carrier + tracking), Mark Delivered
    - Internal notes section for vendor notes

11. Admin Dashboard
    - Sidebar navigation (Dashboard, Users, Orders, Categories, Cancellations, Returns)
    - KPI cards: Total Users, Total Orders, Revenue Today, Revenue This Month, Pending Cancellations, Pending Returns
    - Orders by status doughnut chart
    - Recent orders table with status update dropdown

12. Admin Users Page
    - Search bar + role filter tabs + status filter
    - Data table: avatar, name, email, role badge, status badge, registered date, actions (View, Suspend, Delete)

13. Admin Order Detail Page
    - Full order view with admin-only action panel
    - Update status dropdown with note field
    - Admin notes history
    - Refund form

14. Login Page
    - Centered card: email + password inputs, "Remember me" checkbox, Login button, links to Register + Forgot Password

15. Register Page
    - Centered card: first name, last name, email, phone, password, confirm password, CTA, link to Login
    - Role selector (Customer or Vendor)

16. OTP Verification Page
    - Centered card: 6-box OTP digit input, countdown timer, Resend OTP link, Verify button

17. Forgot Password / Reset Password
    - Minimal centered card flow across 3 steps: email input → OTP entry → new password input

DESIGN SYSTEM / COMPONENTS TO INCLUDE
- Button variants: Primary (filled indigo), Secondary (outlined), Danger (red), Ghost (text only)
- Status badges: Pending (amber), Confirmed (blue), Shipped (indigo), Delivered (green), Cancelled (red), Returned (orange)
- Form inputs: text, email, password (with show/hide toggle), select dropdown, textarea
- Product card, Order card, Stats/KPI card
- Data table with sort headers and pagination
- Modal / dialog
- Toast notifications (success, error, info)
- Loading skeleton screens
- Empty state illustrations
- 3-step progress wizard
- Vertical tracking timeline
- Side navigation (vendor + admin)
- Top navigation (public + customer)
- Mobile-responsive navigation (hamburger menu + bottom tab bar)

RESPONSIVE BREAKPOINTS
- Mobile: 375px+
- Tablet: 768px+
- Desktop: 1280px+

DELIVERABLES
- Full component library
- All 17 pages in desktop + mobile views
- Prototype connections between pages showing user flows:
  1. Guest browsing → Register → OTP → Shop → Cart → Checkout → Order placed
  2. Customer → Login → View Orders → Track Order → Request Cancellation
  3. Vendor → Login → Dashboard → Accept Order → Ship Order
  4. Admin → Login → Dashboard → Manage Orders → Update Status → Issue Refund
```

---

*Generated by GitHub Copilot for the Acocie Stores project.*

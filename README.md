# FullStack E-commerce Platform

A scalable and high-performance e-commerce platform for furniture with complete user and admin workflows. This project is designed to handle real-world scenarios, including secure authentication, multi-step verification, and advanced order management.

## Key Features

* **Modular MVC Architecture**: Clean, maintainable, and organized codebase for scalability.
* **Google OAuth**: Secure authentication using Passport.js.
* **Multi-Step Verification**: Email confirmation, SMS OTP verification, and CAPTCHA protection.
* **AI-Powered Chatbot**: Assists users with product discovery, FAQs, and order-related queries.
* **Admin Dashboard**: Advanced controls to manage users, products, and orders.
* **Razorpay Integration**: Secure payment processing with real-time tracking.
* **Optimized Database**: MongoDB with aggregation pipelines for efficient data handling.
* **Responsive UI**: Clean design with templating engines.
* **Scalable Deployment**: Hosted on AWS for high availability.


### Cloning the Repository

```
https://github.com/AbhiramN-Mern/Ecommerce-UrbenNest.git
cd Ecommerce-UrbenNest
```

### Environment Setup

Create a `.env` file in the root directory and add the following variables:

```
PORT=3000
MONGODB_URI=<your-mongodb-uri>
SESSION_SECRET=<your-session-secret>
NODEMAILER_EMAIL=<your-email>
NODEMAILER_PASSWORD=<your-email-password>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
RECAPTCHA_SECRET=<your-recaptcha-secret>
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
```

**Important:** Never share your `.env` file publicly.

### Installing Dependencies

```
npm install
```

### Running the Application

```
npm start
```

The server should now be running on `http://localhost:3000`.

## Project Structure

```
Directory structure:
└── abhiramn-mern-ecommerce-urbennest/
    ├── app.js
    ├── package.json
    ├── config/
    │   ├── db.js
    │   ├── passport.js
    │   └── razorpay.js
    ├── controller/
    │   ├── admin/
    │   │   ├── adminController.js
    │   │   ├── brandController.js
    │   │   ├── categoryController.js
    │   │   ├── coupenController.js
    │   │   ├── customerController.js
    │   │   ├── orderController.js
    │   │   ├── productController.js
    │   │   └── walletController.js
    │   └── user/
    │       ├── cartController.js
    │       ├── orderController.js
    │       ├── productController.js
    │       ├── profileController.js
    │       ├── userController.js
    │       └── wishlistcontroller.js
    ├── helpers/
    │   └── multer.js
    ├── middlewares/
    │   └── auth.js
    ├── models/
    │   ├── addressSchema.js
    │   ├── bannerSchema.js
    │   ├── brandSchema.js
    │   ├── cartSchema.js
    │   ├── categoryScheema.js
    │   ├── coupenSchema.js
    │   ├── orderSchema.js
    │   ├── productSchema.js
    │   ├── userSchema.js
    │   ├── walletSchema.js
    │   └── wishListSchema.js
    ├── public/
    │   ├── css/
    │   ├── fonts/
    ├── routes/
    │   ├── adminRouter.js
    │   └── userRouter.js
    └── views/
        ├── admin/
        │   ├── adminlogin.ejs
        │   ├── brand.ejs
        │   ├── category.ejs
        │   ├── coupon.ejs
        │   ├── customers.ejs
        │   ├── dashboard.ejs
        │   ├── edit-category.ejs
        │   ├── edit-product.ejs
        │   ├── editCoupon.ejs
        │   ├── order-details-admin.ejs
        │   ├── order-list.ejs
        │   ├── product-add.ejs
        │   ├── products.ejs
        │   └── wallet-transactions.ejs
        ├── partials/
        │   ├── admin/
        │   │   ├── footer.ejs
        │   │   └── header.ejs
        │   └── user/
        │       ├── footer.ejs
        │       └── header.ejs
        └── user/
            ├── about.ejs
            ├── add-address.ejs
            ├── cart.ejs
            ├── change-email-otp.ejs
            ├── change-email.ejs
            ├── change-password-otp.ejs
            ├── change-password.ejs
            ├── checkoutcart.ejs
            ├── contact.ejs
            ├── edit-address.ejs
            ├── forgot-password.ejs
            ├── forgotPass-otp.ejs
            ├── home.ejs
            ├── login.ejs
            ├── new-email.ejs
            ├── orderDetails.ejs
            ├── page-404.ejs
            ├── product-details.ejs
            ├── profile.ejs
            ├── reset-password.ejs
            ├── shop.ejs
            ├── shopOG.ejs
            ├── signup.ejs
            ├── verifyOTP.ejs
            └── wishlist.ejs

```

## Deployment

For deploying this project to AWS or any cloud provider, ensure your environment variables are set securely using a secrets manager.

## Contributing

For major changes, please open an issue first to discuss what you would like to change.



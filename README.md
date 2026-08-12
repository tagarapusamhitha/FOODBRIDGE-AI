# 🍽️ FOODBRIDGE AI

### AI-Powered Food Waste Reduction & Redistribution System

> **REDUCE WASTE. FEED HOPE. CREATE IMPACT.**

FOODBRIDGE AI is a full-stack web platform designed to reduce food waste by connecting **food donors, NGOs, and communities** through an intelligent food redistribution system.

The platform allows donors to list surplus food, NGOs to discover and claim available food, and administrators to monitor the overall ecosystem through analytics, maps, notifications, and dashboards.

---

## 🌐 Live Demo

🚀 **Live Application:**  
(https://foodbridge-ai-ten.vercel.app/)

> Replace the URL above with your actual Vercel URL if your deployed URL is different.

---

## 🎯 Problem Statement

Large quantities of edible food are wasted every day while many communities face food insecurity.

The major challenges include:

- Difficulty connecting food donors with NGOs
- Lack of real-time visibility of available food
- Inefficient food pickup coordination
- Lack of location-based food redistribution
- Limited monitoring and analytics
- Difficulty tracking the complete donation lifecycle

FOODBRIDGE AI addresses these challenges through a centralized digital platform.

---

## 💡 Solution

FOODBRIDGE AI provides a platform where:

**Donors**
→ list surplus food

**FOODBRIDGE AI**
→ stores, analyzes, locates, and prioritizes donations

**NGOs**
→ discover and claim suitable donations

**NGOs**
→ manage pickup and delivery

**Administrators**
→ monitor donations, users, NGOs, analytics, and environmental impact

---

# ✨ Key Features

## 👤 Donor Dashboard

Donors can:

- Create food donations
- Enter food details
- Specify quantity and category
- Provide pickup location
- Use GPS/location information
- Upload food images
- View donation history
- Track donation status
- View notifications
- View analytics
- Access AI-based NGO matching

---

## 🤝 NGO Dashboard

NGOs can:

- View available food donations
- Search and filter donations
- Claim available donations
- Manage accepted donations
- Update pickup status
- Update delivery status
- Contact donors
- View donation locations
- Use the integrated map
- Optimize pending pickup routes
- View AI matching scores

### Donation Workflow

```text
Available
    ↓
Accepted
    ↓
Picked Up
    ↓
Delivered

---

# 💡 Our Solution

FOODBRIDGE AI provides an end-to-end workflow:

```text
🏗️ System Architecture
                         ┌───────────────────────┐
                         │     FOODBRIDGE AI     │
                         │      FRONTEND         │
                         └───────────┬───────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
   Donor Dashboard            NGO Dashboard             Admin Dashboard
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      REST APIs        │
                         │   Node.js + Express   │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
          MongoDB               AI Matching          Location Services
              │                      │                      │
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     │
                                     ▼
                              FOOD REDISTRIBUTION
                                     │
                                     ▼
                              SOCIAL + ENVIRONMENTAL
                                    IMPACT
⭐ If you find this project interesting, consider giving the repository a star!

# Kala-Kart Machine Learning Pricing Foundation

## Dataset Schema & Governance Documentation

### 1. Status
- **Canonical Dataset (`pricing_training.csv`)**: `NOT READY FOR PRODUCTION`
- **Awaiting**: Legitimate empirical field observations from verified artisan cooperatives, craft clusters, and authentic e-commerce platforms.
- **Strict Prohibition**: No fabricated or synthetic data may ever be committed to `pricing_training.csv`.
- **Demo / Synthetic Dataset (`synthetic_demo_data.csv`)**: Clearly isolated and labeled with header warnings. Used purely for validating code syntax, cross-validation splits, and tree regression mathematics.

---

### 2. Dataset Schema Reference (`data/pricing/pricing_training.csv`)

| Column Name | Type | Description | Missing Allowed |
|---|---|---|---|
| `id` | string | Unique product record identifier | No |
| `category` | string | High-level craft category (pottery, textiles, metalwork, woodcraft, jewelry, painting) | No |
| `subcategory` | string | Specific product taxonomy (vase, saree, figurine, etc.) | No |
| `material` | string | Primary physical material (terracotta, chanderi_silk, brass, sheesham_wood, etc.) | No |
| `craft_technique` | string | Traditional production technique (wheel_thrown, dokra_lost_wax, jamdani, etc.) | No |
| `color` | string | Primary or dominant color scheme | No |
| `length_cm` | float | Length in cm (applicable to textiles, jewelry, flat items) | Yes (null for round items) |
| `width_cm` | float | Width in cm (applicable to textiles, trays, jewelry) | Yes (null for round items) |
| `height_cm` | float | Height in cm (applicable to vases, statues, boxes) | Yes (null for flat items) |
| `diameter_cm` | float | Diameter in cm (applicable to pots, plates, bowls) | Yes (null for rectangular items) |
| `weight_g` | float | Net physical weight in grams | Yes |
| `quantity` | integer | Number of items in unit or set | No |
| `handmade` | boolean | Verified 100% handmade flag | No |
| `production_time_hours` | float | Total craft fabrication hours invested | Yes |
| `raw_material_cost_inr` | float | Artisan direct material expenditure (₹) | No |
| `labor_cost_inr` | float | Fair artisan labor cost (₹) | No |
| `packaging_cost_inr` | float | Packaging and protection cost (₹) | No |
| `other_cost_inr` | float | Tool wear, firing fuel, transport, studio overhead (₹) | No |
| `market_median_price_inr` | float | Median price from verified external market observations (₹) | Yes (null if market unavailable) |
| `market_min_price_inr` | float | Minimum market observation (₹) | Yes |
| `market_max_price_inr` | float | Maximum market observation (₹) | Yes |
| `market_sample_count` | integer | Number of legitimate market observations sampled | Yes |
| `market_trend_score` | float | Normalized 90-day market price trend score (-1.0 to +1.0) | Yes |
| `market_observation_date` | string | ISO date of latest verified market observation | Yes |
| `description_length` | integer | Character count of verified artisan description | No |
| `design_complexity_score` | float | Normalized artisan design complexity rating (0.0 - 1.0) | No |
| `image_quality_score` | float | Visual clarity score of primary uploaded photograph (0.0 - 1.0) | No |
| `target_selling_price_inr` | float | **Regression Target**: Optimal selling price in INR (₹) | No |

---

### 3. Model Versioning & Pipeline

- **Algorithm**: Random Forest Regressor (Decision Tree Ensemble with Bootstrap Bagging and Subspace Sampling).
- **Evaluation Metrics**: MAE (₹), RMSE (₹), R², and SMAPE (%).
- **Sanity Check**: Cost per unit calculation ensures the ML prediction flags if an estimate is below the artisan's break-even production cost.

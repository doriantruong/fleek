import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
  updateTaxRegionsWorkflow,
  createUserAccountWorkflow
} from '@medusajs/medusa/core-flows'

import { SELLER_MODULE } from '@mercurjs/b2c-core/modules/seller'
import {
  createConfigurationRuleWorkflow,
  createLocationFulfillmentSetAndAssociateWithSellerWorkflow,
  createSellerWorkflow
} from '@mercurjs/b2c-core/workflows'
import { createCommissionRuleWorkflow } from '@mercurjs/commission/workflows'
import {
  ConfigurationRuleDefaults,
  SELLER_SHIPPING_PROFILE_LINK
} from '@mercurjs/framework'

import { productsToInsert } from './seed-products'

// Use VN as the default region for seeding (matches sample product pricing)
const countries = ['vn']

export async function createAdminUser(container: MedusaContainer) {
  const authService = container.resolve(Modules.AUTH)
  const userService = container.resolve(Modules.USER)
  
  // Check if admin user already exists
  const [existingUser] = await userService.listUsers({
    email: 'admin@mercurjs.com'
  })
  
  if (existingUser) {
    return existingUser
  }
  
  // Create auth identity with password
  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'admin@mercurjs.com',
      password: 'supersecret'
    }
  })
  
  if (!authIdentity?.id) {
    throw new Error('Failed to create admin auth identity')
  }
  
  // Create admin user account
  const { result: user } = await createUserAccountWorkflow(container).run({
    input: {
      userData: {
        email: 'admin@mercurjs.com',
        first_name: 'Admin',
        last_name: 'User'
      },
      authIdentityId: authIdentity.id
    }
  })
  
  return user
}

export async function createSalesChannel(container: MedusaContainer) {
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  let [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels(
    {
      name: 'Default Sales Channel'
    }
  )

  if (!defaultSalesChannel) {
    const {
      result: [salesChannelResult]
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel'
          }
        ]
      }
    })
    defaultSalesChannel = salesChannelResult
  }

  return defaultSalesChannel
}

export async function createStore(
  container: MedusaContainer,
  salesChannelId: string,
  regionId: string
) {
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    return
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId
      }
    }
  })
}
export async function createRegions(container: MedusaContainer) {
  const regionModuleService = container.resolve(Modules.REGION)

  // If the default region already exists (from migrations), reuse it to keep seed idempotent.
  const [existingRegion] = await regionModuleService.listRegions({
    name: 'Vietnam'
  })

  if (existingRegion) {
    return existingRegion
  }

  const {
    result: [region]
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: 'Vietnam',
          currency_code: 'vnd',
          countries,
          payment_providers: ['pp_system_default']
        }
      ]
    }
  })

  const { result: taxRegions } = await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code
    }))
  })

  await updateTaxRegionsWorkflow(container).run({
    input: taxRegions.map((taxRegion) => ({
      id: taxRegion.id,
      provider_id: 'tp_system'
    }))
  })

  return region
}

export async function createPublishableKey(
  container: MedusaContainer,
  salesChannelId: string
) {
  const apiKeyService = container.resolve(Modules.API_KEY)

  let [key] = await apiKeyService.listApiKeys({ type: 'publishable' })

  if (!key) {
    const {
      result: [publishableApiKeyResult]
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Default publishable key',
            type: 'publishable',
            created_by: ''
          }
        ]
      }
    })
    key = publishableApiKeyResult
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: key.id,
      add: [salesChannelId]
    }
  })

  return key
}

export async function createProductCategories(container: MedusaContainer) {
  const productModuleService = container.resolve(Modules.PRODUCT)
  const existing = await productModuleService.listProductCategories(
    {},
    { select: ['id', 'handle'] }
  )

  const existingHandles = new Set(existing.map((c) => c.handle))

  const categories = [
    {
      name: 'Sneakers',
      is_active: true
    },
    {
      name: 'Sandals',
      is_active: true
    },
    {
      name: 'Boots',
      is_active: true
    },
    {
      name: 'Sport',
      is_active: true
    },
    {
      name: 'Accessories',
      is_active: true
    },
    {
      name: 'Tops',
      is_active: true
    }
  ]

  const toCreate = categories.filter((category) => {
    const handle = category.name.toLowerCase().replace(/\s+/g, '-')
    return !existingHandles.has(handle)
  })

  if (!toCreate.length) {
    return existing
  }

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: toCreate
    }
  })

  return [...existing, ...result]
}

export async function createProductCollections(container: MedusaContainer) {
  const productModuleService = container.resolve(Modules.PRODUCT)
  const existing = await productModuleService.listProductCollections(
    {},
    { select: ['id', 'handle'] }
  )

  const existingHandles = new Set(existing.map((c) => c.handle))

  const collections = [
    {
      title: 'Luxury'
    },
    {
      title: 'Vintage'
    },
    {
      title: 'Casual'
    },
    {
      title: 'Soho'
    },
    {
      title: 'Streetwear'
    },
    {
      title: 'Y2K'
    }
  ]

  const toCreate = collections.filter((collection) => {
    const handle = collection.title.toLowerCase().replace(/\s+/g, '-')
    return !existingHandles.has(handle)
  })

  if (!toCreate.length) {
    return existing
  }

  const { result } = await createCollectionsWorkflow(container).run({
    input: {
      collections: toCreate
    }
  })

  return [...existing, ...result]
}

export async function createSeller(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: existingSellers
  } = await query.graph({
    entity: 'seller',
    fields: ['id', 'name', 'handle'],
    filters: {
      handle: 'mercurjs-store'
    }
  })

  if (existingSellers?.length) {
    return existingSellers[0]
  }

  const authService = container.resolve(Modules.AUTH)

  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'seller@mercurjs.com',
      password: 'secret'
    }
  })

  try {
    const { result: seller } = await createSellerWorkflow.run({
      container,
      input: {
        auth_identity_id: authIdentity?.id,
        member: {
          name: 'John Doe',
          email: 'seller@mercurjs.com'
        },
        seller: {
          name: 'MercurJS Store'
        }
      }
    })

    return seller
  } catch (err: any) {
    const message = err?.message || ''

    if (message.includes('already exists')) {
      const {
        data: [seller]
      } = await query.graph({
        entity: 'seller',
        fields: ['*'],
        filters: {
          handle: 'mercurjs-store'
        }
      })

      return seller
    }

    throw err
  }
}

export async function createSellerStockLocation(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Re-use existing stock location if it already exists to keep the seed idempotent
  const {
    data: [existing]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['*', 'fulfillment_sets.*'],
    filters: {
      name: `Stock Location for seller ${sellerId}`
    }
  })

  if (existing) {
    return existing
  }

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const {
    result: [stock]
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: `Stock Location for seller ${sellerId}`,
          address: {
            address_1: 'Random Strasse',
            city: 'Berlin',
            country_code: 'de'
          }
        }
      ]
    }
  })

  await link.create([
    {
      [SELLER_MODULE]: {
        seller_id: sellerId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    },
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: 'manual_manual'
      }
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: salesChannelId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    }
  ])

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow.run({
    container,
    input: {
      fulfillment_set_data: {
        name: `${sellerId} fulfillment set`,
        type: 'shipping'
      },
      location_id: stock.id,
      seller_id: sellerId
    }
  })

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['*', 'fulfillment_sets.*'],
    filters: {
      id: stock.id
    }
  })

  return stockLocation
}

export async function createServiceZoneForFulfillmentSet(
  container: MedusaContainer,
  sellerId: string,
  fulfillmentSetId: string
) {
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  const [existing] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    },
    name: 'Europe'
  })

  if (existing) {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    await link.create({
      [SELLER_MODULE]: {
        seller_id: sellerId
      },
      [Modules.FULFILLMENT]: {
        service_zone_id: existing.id
      }
    })
    return existing
  }

  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: `Europe`,
          geo_zones: countries.map((c) => ({
            type: 'country',
            country_code: c
          }))
        }
      ]
    }
  })

  const [zone] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    }
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      service_zone_id: zone.id
    }
  })

  return zone
}

export async function createSellerShippingOption(
  container: MedusaContainer,
  sellerId: string,
  sellerName: string,
  regionId: string,
  serviceZoneId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [shippingProfile]
  } = await query.graph({
    entity: SELLER_SHIPPING_PROFILE_LINK,
    fields: ['shipping_profile_id'],
    filters: {
      seller_id: sellerId
    }
  })

  const {
    result: [shippingOption]
  } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: `${sellerName} shipping`,
        shipping_profile_id: shippingProfile.shipping_profile_id,
        service_zone_id: serviceZoneId,
        provider_id: 'manual_manual',
        type: {
          label: `${sellerName} shipping`,
          code: sellerName,
          description: 'Europe shipping'
        },
        rules: [
          { value: 'true', attribute: 'enabled_in_store', operator: 'eq' },
          { attribute: 'is_return', value: 'false', operator: 'eq' }
        ],
        prices: [
          { currency_code: 'eur', amount: 10 },
          { amount: 10, region_id: regionId }
        ],
        price_type: 'flat',
        data: { id: 'manual-fulfillment' }
      }
    ]
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      shipping_option_id: shippingOption.id
    }
  })

  return shippingOption
}

export async function createSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const productService = container.resolve(Modules.PRODUCT)
  const collections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const categories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )

  // Basic sanity check to help debug missing seed data
  console.log('Seed products: collections', collections.length, 'categories', categories.length)

  const randomCategory = () =>
    categories[Math.floor(Math.random() * categories.length)]
  const randomCollection = () =>
    collections[Math.floor(Math.random() * collections.length)]

  const toInsert = productsToInsert.map((p) => ({
    ...p,
    // Bảo đảm mỗi biến thể có thêm giá USD để khớp với locale us
    variants: p.variants.map((variant) => {
      const hasUsd = variant.prices?.some((pr) => pr.currency_code === 'usd')
      const baseAmount = variant.prices?.[0]?.amount ?? 0

      return {
        ...variant,
        prices: hasUsd
          ? variant.prices
          : [
              ...(variant.prices || []),
              {
                currency_code: 'usd',
                amount: baseAmount
              }
            ]
      }
    }),
    supported_countries: ['us', 'vn'],
    categories: [
      {
        id: randomCategory().id
      }
    ],
    collection_id: randomCollection().id,
    sales_channels: [
      {
        id: salesChannelId
      }
    ]
  }))

  console.log('Seed products: prepared entries', toInsert.length)

  const { result } = await createProductsWorkflow.run({
    container,
    input: {
      products: toInsert,
      additional_data: {
        seller_id: sellerId
      }
    }
  })

  return result
}

export async function createInventoryItemStockLevels(
  container: MedusaContainer,
  stockLocationId: string
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const items = await inventoryService.listInventoryItems(
    {},
    { select: ['id'] }
  )

  const toCreate = items.map((i) => ({
    inventory_item_id: i.id,
    location_id: stockLocationId,
    stocked_quantity: Math.floor(Math.random() * 50) + 1
  }))

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: {
      inventory_levels: toCreate
    }
  })
  return result
}

export async function createDefaultCommissionLevel(container: MedusaContainer) {
  await createCommissionRuleWorkflow.run({
    container,
    input: {
      name: 'default',
      is_active: true,
      reference: 'site',
      reference_id: '',
      rate: {
        include_tax: true,
        type: 'percentage',
        percentage_rate: 2
      }
    }
  })
}

export async function createConfigurationRules(container: MedusaContainer) {
  for (const [ruleType, isEnabled] of ConfigurationRuleDefaults) {
    try {
      await createConfigurationRuleWorkflow.run({
        container,
        input: {
          rule_type: ruleType,
          is_enabled: isEnabled
        }
      })
    } catch (err: any) {
      const message = err?.message || ''

      // Skip if the rule already exists to keep the seed idempotent.
      if (message.includes('already exists')) {
        continue
      }

      throw err
    }
  }
}

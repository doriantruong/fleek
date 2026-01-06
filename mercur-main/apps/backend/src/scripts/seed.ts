import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import {
  createAdminUser,
  createConfigurationRules,
  createDefaultCommissionLevel,
  createInventoryItemStockLevels,
  createProductCategories,
  createProductCollections,
  createPublishableKey,
  createRegions,
  createSalesChannel,
  createSeller,
  createSellerProducts,
  createSellerShippingOption,
  createSellerStockLocation,
  createServiceZoneForFulfillmentSet,
  createStore
} from './seed/seed-functions'

export default async function seedMarketplaceData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    logger.info('=== Configurations ===')
    logger.info('Creating admin user...')
    await createAdminUser(container)
    console.log('Admin user created')
    logger.info('Creating default sales channel...')
    const salesChannel = await createSalesChannel(container)
    console.log('Sales channel created', salesChannel.id)
    logger.info('Creating default regions...')
    const region = await createRegions(container)
    console.log('Region created', region.id)
    logger.info('Creating publishable api key...')
    const apiKey = await createPublishableKey(container, salesChannel.id)
    console.log('Publishable key', apiKey.token)
    logger.info('Creating store data...')
    await createStore(container, salesChannel.id, region.id)
    console.log('Store updated')
    logger.info('Creating configuration rules...')
    await createConfigurationRules(container)
    console.log('Configuration rules ready')

    logger.info('=== Example data ===')
    logger.info('Creating product categories...')
    await createProductCategories(container)
    console.log('Categories created')
    logger.info('Creating product collections...')
    await createProductCollections(container)
    console.log('Collections created')
    logger.info('Creating seller...')
    const seller = await createSeller(container)
    console.log('Seller created', seller.id)
    logger.info('Creating seller stock location...')
    const stockLocation = await createSellerStockLocation(
      container,
      seller.id,
      salesChannel.id
    )
    console.log('Stock location created', stockLocation.id)
    logger.info('Creating service zone...')
    const serviceZone = await createServiceZoneForFulfillmentSet(
      container,
      seller.id,
      stockLocation.fulfillment_sets[0].id
    )
    console.log('Service zone', serviceZone.id)
    logger.info('Creating seller shipping option...')
    await createSellerShippingOption(
      container,
      seller.id,
      seller.name,
      region.id,
      serviceZone.id
    )
    console.log('Shipping option created')
    logger.info('Creating seller products...')
    await createSellerProducts(container, seller.id, salesChannel.id)
    console.log('Products created')
    logger.info('Creating inventory levels...')
    await createInventoryItemStockLevels(container, stockLocation.id)
    console.log('Inventory levels created')
    logger.info('Creating default commission...')
    await createDefaultCommissionLevel(container)
    console.log('Commission created')

    logger.info('=== Finished ===')
    logger.info(`Publishable api key: ${apiKey.token}`)
    logger.info(`Admin panel access:`)
    logger.info(`email: admin@mercurjs.com`)
    logger.info(`pass: supersecret`)
    logger.info(`Vendor panel access:`)
    logger.info(`email: seller@mercurjs.com`)
    logger.info(`pass: secret`)
  } catch (err) {
    // Explicitly log the error to stdout so medusa exec surfaces it
    console.error('Seed failed', err)
    throw err
  }
}

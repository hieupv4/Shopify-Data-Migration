import axios from 'axios';
import fs from 'fs';
import meowLog from '@meowapp/meowlog';

const config = {
  API_URL: 'https://shopify.myshopify.com/admin/api/2023-07/graphql.json',
  ADMIN_SECRET: '', // generate by develop app in shopify admin
};

async function fetchApi(query, variables) {
  const fetch = await axios.post(
    config.API_URL,
    JSON.stringify({ query, variables }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': config.ADMIN_SECRET,
      },
    }
  );
  return fetch.data;
}

function logger(...props) {
  console.log(
    '-------------------------MIGRATION DATA-------------------------'
  );
  meowLog(props);
  console.log(
    '-------------------------MIGRATION DATA-------------------------'
  );
}
// ... (previous code)

// Introduce a 1-second (1000 milliseconds) sleep delay
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  try {
    const data = fs.readFileSync('data.json', 'utf-8');
    const jsonData = JSON.parse(data);

    // YOUR SCRIPT ENTER IN HERE
    const gql = String.raw;
    for (const location of jsonData) {
      // find Location first if existing location use locationEdit

      const locationsQuery = gql`
        query {
          locations(query: "name:${location.name}", first: 1)  {
            nodes {
              id
            }
          }
        }
      `;

      const locationsFetch = await fetchApi(locationsQuery, {});

      logger('FIND LOCATION', location.name, locationsFetch);

      const isFoundLocation =
        locationsFetch?.data?.locations?.nodes?.[0]?.id || '';

      if (isFoundLocation !== '') {
        // update location
        const deactiveQuery = gql`
          mutation locationDeactivate($locationId: ID!) {
            locationDeactivate(locationId: $locationId) {
              location {
                id
              }
              locationDeactivateUserErrors {
                field
                message
              }
            }
          }
        `;

        const deactiveOptions = {
          locationId: isFoundLocation,
        };

        const deactiveFetch = await fetchApi(deactiveQuery, deactiveOptions);
        logger('DEACTIVE LOCATION', deactiveFetch);

        // update location
        const query = gql`
          mutation locationDelete($locationId: ID!) {
            locationDelete(locationId: $locationId) {
              deletedLocationId
              locationDeleteUserErrors {
                field
                message
              }
            }
          }
        `;

        const options = {
          locationId: isFoundLocation,
        };

        const fetch = await fetchApi(query, options);
        logger('DELETE LOCATION', fetch);
      }

      const locationAddQuery = gql`
        mutation locationAdd($input: LocationAddInput!) {
          locationAdd(input: $input) {
            location {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // remove currently metafields id
      let actualMetafields = location.metafields.nodes;
      actualMetafields.filter((item) => {
        delete item.id;
        return item;
      });

      const locationAddOptions = {
        input: {
          address: {
            address1: location.address?.address1 || '',
            address2: location.address?.address2 || '',
            city: location.address?.city || '',
            countryCode: location.address?.countryCode || '',
            phone: location.address?.phone || '',
            provinceCode: location.address?.provinceCode || '',
            zip: location.address?.zip || '',
          },
          fulfillsOnlineOrders: true,
          name: location.name,
          metafields: actualMetafields,
        },
      };

      const fetch = await fetchApi(locationAddQuery, locationAddOptions);

      logger('LOCATION ADD', fetch);

      // Add a 1-second delay
      await sleep(1000);
    }
    // YOUR SCRIPT ENTER IN HERE
  } catch (error) {
    logger(error.message);
  }
})();

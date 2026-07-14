import { writeFile } from "node:fs/promises";
import {
  Country,
  State,
  City,
} from "country-state-city";

const FILES = {
  countries: "countries.json",
  states: "states.json",
  cities: "cities.json",
};

async function main() {
  const countries = Country.getAllCountries();

  const output = {
    countries: [],
    states: [],
    cities: [],
  };

  for (const country of countries) {
    console.log(`Country: ${country.name}`);

    output.countries.push({
      value: country.isoCode,
      label: country.name,
    });

    const states = State.getStatesOfCountry(country.isoCode);

    for (const state of states) {
      console.log(`  State: ${state.name}`);

      output.states.push({
        parent: country.isoCode,
        value: state.isoCode,
        label: state.name,
      });

      const cities = City.getCitiesOfState(
        country.isoCode,
        state.isoCode
      );

      for (const city of cities) {
        output.cities.push({
          parent: country.isoCode,
          value: state.isoCode,
          label: city.name,
        });
      }
    }
  }

  await writeFile(
    FILES.countries,
    JSON.stringify(output.countries, null, 2)
  );

  await writeFile(
    FILES.states,
    JSON.stringify(output.states, null, 2)
  );

  await writeFile(
    FILES.cities,
    JSON.stringify(output.cities, null, 2)
  );

  console.log("\n✅ Export complete");
  console.log({
    countries: output.countries.length,
    states: output.states.length,
    cities: output.cities.length,
  });
}

main().catch(console.error);

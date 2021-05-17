<template>
  <v-container fluid>
    <v-row no-gutters class="d-flex justify-space-between mt-10 mb-6">
      <h1 class="page-title">Dashboard</h1>
      <v-menu offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-btn
            v-bind="attrs"
            v-on="on"
            color="secondary"
            class="text-capitalize button-shadow mr-1"
          >Some Menu
          </v-btn>
        </template>
      </v-menu>
    </v-row>
    <v-row>
      <v-col lg="3" sm="6" md="5" cols="12">
        <v-card class="mx-1 mb-1">
          <v-card-title class="pa-6 pb-3">
            <p>Some Card</p>
          </v-card-title>
          <v-card-text class="pa-6 pt-0">
            <v-row no-gutters class="pb-5">
              <v-col cols="5" class="my-auto">
                Some Card Text
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">

export default {};

</script>

<style scoped lang="scss">

</style>
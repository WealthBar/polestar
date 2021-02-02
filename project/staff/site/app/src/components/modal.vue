<template>
  <transition name="fade">
    <div v-if="displayed" class="modal-overlay" @click.self="close">
      <dialog class="modal-box" @click.self.prevent>
        <header :class="{ 'title': title }">
          <button class="modal-close" @click="close">❌</button>
          <div class="title-block">
            <h3 class="no-margin" v-if="title">{{title}}</h3>
            <slot class="title-action" name="title-action"/>
          </div>
        </header>
        <section class="body">
          <slot name="body"/>
        </section>
        <footer class="modal-footer">
          <slot name="footer"/>
        </footer>
      </dialog>
    </div>
  </transition>
</template>
<script>

  export const modal = {
    props: {
      displayed: {
        type: Boolean,
        default: false,
      },
      title: {
        type: String,
        default: '',
      },
    },

    methods: {
      close() {
        this.$emit('close');
      },
    },
  };

  export default modal;

</script>

<style lang="scss" scoped>

  .modal-overlay {
    width: 100%;
    height: 100%;
    position: fixed;
    z-index: 100;
    left: 0;
    top: 0;
    background-color: rgba(16, 16, 16, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    animation-duration: 0.3s;
  }

  dialog {
    background-color: white;
    position: relative;
    z-index: 101;
    padding: 0;
    border: none;
    display: flex;
    flex-direction: column;
    -webkit-overflow-scrolling: touch;
  }

  section.body {
    padding: 1rem;
    overflow-y: auto;
    flex: auto;
  }

  header.title {
    background-color: #eee;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #111;
    padding: 0.5rem;

    .title-block {
      flex: 2 0 0;
      display: flex;
      flex-flow: row nowrap;
      justify-content: flex-end;
      align-items: center;
      margin: auto;

      h3 {
        text-transform: capitalize;
        flex-grow: 2;
        text-align: left;
        margin-left: 0.5rem;
      }
    }
  }

  .modal-close {
    display: block;
    color: black;
    background: none;
    box-shadow: none;
    padding: 0;
    height: 2rem;
    line-height: 1;
    cursor: pointer;
    margin: 0 0.5rem;
    text-decoration: none;
  }

  footer {
    padding: 0.5rem;
    border-top: 1px solid #111;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    background-color: #eee;

    &:empty {
      display: none;
    }
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity .25s;
  }

  .fade-enter, .fade-leave-to {
    opacity: 0;
  }

</style>

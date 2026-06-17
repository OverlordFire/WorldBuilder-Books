const menuItems = document.querySelectorAll('.item-bar');

function setActive() {
    menuItems.forEach(item => item.classList.remove('ativo'));
    this.classList.add('ativo');
}

menuItems.forEach(item => item.addEventListener('click', setActive));

const btnExp = document.querySelector('#btn-exp')
const menuSide = document.querySelector('.Sidebar')

btnExp.addEventListener('click', function(){
    menuSide.classList.toggle('Expand')
})
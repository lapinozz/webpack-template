import "./style/main.scss";

import Data from "./js/data";
import Swipe from "./js/swipe";
import Modal from "./js/modal";
import Localization from "./js/localization";
import setupFullscreen from "./js/setupFullscreen";

import Page from "./js/page";

import PageCommunities from "./js/pages/communities";
import PageAssistantSouls from "./js/pages/assistant-souls";
import PageAssistantSpaces from "./js/pages/assistant-spaces";
import PageAssistantAssociate from "./js/pages/assistant-associate";
import PageSoul from "./js/pages/soul";
import PageSpace from "./js/pages/space";
import PageNucleus from "./js/pages/nucleus";
import PageGraphViewer from "./js/pages/graph-viewer";

const loc = new Localization();

const pageClassList = [PageCommunities, PageAssistantSouls, PageAssistantSpaces, PageAssistantAssociate, PageSoul, PageSpace, PageNucleus, PageGraphViewer];

class App
{
	pages = [];
	selectedPage = null;
	currentType = "";
	loc = loc;
	data = new Data();

	getPage(id)
	{
		return this.pages.find(page => page.id === id);
	}

	getSelectedPage()
	{
		return this.getPage(this.selectedPage);
	}

	getPageIndex(id)
	{
		return this.pages.findIndex(page => page.id == id);
	}

	adjustPagePosition()
	{
		const id = this.selectedPage;

		let pageDiv = this.getSelectedPage().element;
		let pageScroller = document.querySelector(".page-scroller");
		let pageContainer = document.querySelector(".page-container");

		let pageBox = pageDiv.getBoundingClientRect();
		let scrollerBox = pageScroller.getBoundingClientRect();
		let containerBox = pageContainer.getBoundingClientRect();

		pageScroller.style.left = -pageDiv.offsetLeft + containerBox.width / 2 - pageBox.width / 2 + "px";
		pageContainer.scrollLeft = 0;
	}

	leavePage(id)
	{
		if(this.getPage(id).onLeave() === false)
		{
			return false;
		}

		let headerDiv = document.querySelector(".header-element-" + id);
		if(headerDiv)
		{
			headerDiv.classList.remove("selected");
		}

		return true;
	}

	enterPage(id, force = false)
	{
		if(typeof id === "number")
		{
			id = this.pages[id].id;
		}

		const page = this.getPage(id);

		if(page.type != this.currentType && this.onChangeType(this.currentType, page.type, force) === false && !force)
		{
			return;
		}

		if(this.selectedPage && this.leavePage(this.selectedPage) === false && !force)
		{
			return;
		}

		this.currentType = page.type;
		this.selectedPage = id;
		this.adjustPagePosition();

		page.onEnter();

		let headerDiv = document.querySelector(".header-element-" + id);
		if(headerDiv)
		{
			headerDiv.classList.add("selected");
		}

		this.updateScrollerButtons();
		this.updateHeader();
		this.updateVerticalArrow();
	}

	prevPage(force = false)
	{
		const prevPage = this.getSelectedPage().prevPage;
		if(prevPage)
		{
			this.enterPage(prevPage, force);
		}
	}

	nextPage(force = false)
	{
		const nextPage = this.getSelectedPage().nextPage;
		if(nextPage)
		{
			this.enterPage(nextPage, force);
		}
	}

	pageUp()
	{
		this.getSelectedPage().pageUp();
	}

	pageDown()
	{
		this.getSelectedPage().pageDown();
	}

	onChangeType(oldType, newType, force)
	{
		if(oldType == "assistant" && newType == "intro" && !force)
		{
			const m = new Modal({
				type: 'YesCancel',
				messageLoc: 'app.cancelNucleusCreationConfirmation',
				message: 'Are you sure you want to cancel the creation of the new nucleus?',
				onYes: (() => 
				{
					this.prevPage(true);
					m.close();
				}).bind(this),
				onCancel: () => {
					m.close();
				}
			});
			return false;
		}

		for(const page of this.pages)
		{
			if(page.type == "assistant")
			{
				//page.element.classList.toggle("hidden", newType != "assistant");
			}
		}

		if(oldType == "assistant" && newType == "page")
		{
			const soulsPage = this.getPage('assistant-souls');
			const spacesPage = this.getPage('assistant-spaces');

			const nucleus = this.data.newNucleus();
			const souls = soulsPage.getItems();
			const spaces = spacesPage.getItems();

			nucleus.name = "";

			for(const soulData of souls)
			{
				if(soulData.name)
				{
					const soul = this.data.newSoul(nucleus.id);
					soul.name = soulData.name;
					soul.type = soulData.type;
				}
			}

			for(const spaceData of spaces)
			{
				if(spaceData.name)
				{
					const space = this.data.newSpace(nucleus.id);
					space.name = spaceData.name;
					space.type = spaceData.type;
				}
			}

			this.currentNucleusId = nucleus.id;
		}

		if(newType == "assistant")
		{
			const soulsPage = this.getPage('assistant-souls');
			const spacesPage = this.getPage('assistant-spaces');

			soulsPage.clearItems();
			spacesPage.clearItems();
		}
	}

	updateHeader()
	{
		const header = document.querySelector(".header");
		header.classList.toggle("hidden", !this.getSelectedPage().showHeader);
	}

	updateVerticalArrow()
	{
		const pageContainer = document.querySelector(".page-container");
		pageContainer.classList.toggle("show-vertical-arrow", this.getSelectedPage().showVerticalArrow);
	}

	updateScrollerButtons()
	{
		const scrollLeft = document.querySelector(".page-scroll-left");
		const scrollRight = document.querySelector(".page-scroll-right");

		const page = this.getSelectedPage();

		scrollLeft.classList.toggle("disabled", !page.prevPage);
		scrollRight.classList.toggle("disabled", !page.nextPage);
	}

	initializeScrollerButtons()
	{
		let scrollLeft = document.querySelector(".page-scroll-left");
		let scrollRight = document.querySelector(".page-scroll-right");
		let scrollUp = document.querySelector(".page-scroll-up");
		let scrollDown = document.querySelector(".page-scroll-down");

		scrollLeft.onclick = () => this.prevPage();
		scrollRight.onclick = () => this.nextPage();

		scrollUp.onclick = () => this.pageUp();
		scrollDown.onclick = () => this.pageDown();
	}

	initializePages()
	{
		let pageScroller = document.querySelector(".page-scroller");
		let headerContainer = document.querySelector(".header");
		for(const pageClass of pageClassList)
		{
			const page = new pageClass();
			page.app = this;
			this.pages.push(page);

			const content = page.render();
			content && pageScroller.appendChild(content);

			const title = page.title;
			if(title)
			{
				let titleDiv = document.createElement("div");
				titleDiv.innerText = title;
				titleDiv.classList.add("header-element");
				titleDiv.classList.add("header-element-" + page.id);
				titleDiv.onclick = () => this.enterPage(page.id);
				headerContainer.appendChild(titleDiv);
			}
		}

		this.pages[0].prevPage = "";
		this.pages[this.pages.length - 1].nextPage = "";

		for(let x = 0; x < this.pages.length; x++)
		{
			const page = this.pages[x];
			if(page.prevPage === "" && x > 0)
			{
				page.prevPage = this.pages[x - 1].id;
			}

			if(page.nextPage === "" && x < this.pages.length - 1)
			{
				page.nextPage = this.pages[x + 1].id;
			}
		}

		this.initializeScrollerButtons();

		this.swipe = new Swipe({
			swipeLeft: () => this.getSelectedPage().isSwippable() && this.nextPage(),
			swipeRight: () => this.getSelectedPage().isSwippable() && this.prevPage(),
		});

		this.loadFromStorage();

		this.enterPage(this.pages[0].id);
		//this.enterPage(this.pages[3].id);
		//this.enterPage(this.pages[4].id);
		//this.enterPage(this.pages[6].id);

		this.currentNucleusId = Object.keys(this.data.communities)[0];
		//this.enterPage(this.pages[7].id);

		window.setInterval(() =>
		{
			let pageContainer = document.querySelector(".page-container");
			pageContainer.scrollLeft = 0;
			pageContainer.scrollTop = 0;
		}, 100)

		window.setInterval(() => this.saveToStorage(), 5 * 1000);
	}

	onReisze()
	{
		this.adjustPagePosition();
		this.getSelectedPage().onResize();
	}

	loadFromStorage()
	{
		this.data.import(localStorage.getItem("data"));
	}

	saveToStorage()
	{
		localStorage.setItem("data", this.data.export());
	}
}

const app = new App();
window.app = app;

setTimeout(() => {
	app.initializePages();
}, 1);

window.document.body.onresize = () => {
	setTimeout(() => app.onReisze(), 1);
};

setupFullscreen();

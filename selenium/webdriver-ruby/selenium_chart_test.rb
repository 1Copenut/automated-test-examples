# frozen_string_literal: true

require 'selenium-webdriver'
require 'test-unit'

# Test Yahoo Charts for CSCO
class SeleniumChartTest < Test::Unit::TestCase
  def setup
    @url = 'https://finance.yahoo.com/quote/CSCO/'
    @driver = Selenium::WebDriver.for :firefox
    action = Selenium::WebDriver::ActionBuilder

    @driver.get(@url)
    @driver.manage.window.resize_to(1280, 720)
    @driver.manage.timeouts.implicit_wait = 5

    @wait = Selenium::WebDriver::Wait.new(timeout: 5)
  end

  def test_page_heading
    heading = @wait.until { @driver.find_element(:css, 'section.container h1') }
    puts "Found h1 elem: #{heading.text}"
    assert_equal(heading.text, 'Cisco Systems, Inc. (CSCO)')
  end

  def test_chart_type_switcher
    chart_type_button = @wait.until { @driver.find_element(:css, '[aria-label="Chart Type"]') }
    @driver.action.move_to(chart_type_button)
    chart_type_button.click

    sleep 3

    line_chart_button = @wait.until { @driver.find_element(:css, '[data-value="line"]') }
    @driver.action.move_to(line_chart_button)
    line_chart_button.click

    sleep 3

    assert_equal(line_chart_button.attribute('aria-selected'), 'true')
  end

  def teardown
    @driver.quit
  end
end
